//
//  UIViewController+SYAdd.m
//  artapp
//
//  Created by 刘思源 on 17/8/16.
//  Copyright © 2017年 SJWL. All rights reserved.
//

#import "UIViewController+SYAdd.h"
#import <objc/runtime.h>
#import "UIWindow+JKHierarchy.h"

@implementation UIViewController (SYAdd)

void * popActionKey;

-(void (^)(void))sy_popAction{
    return objc_getAssociatedObject(self, &popActionKey);
}

-(void)setSy_popAction:(void (^)(void))sy_popAction{
    objc_setAssociatedObject(self, &popActionKey,
                             sy_popAction,
                             OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}


+ (UIViewController*)topMostControllerFromWindow:(UIWindow *)window
{
    UIViewController *topController = [window rootViewController];
    
    //  Getting topMost ViewController
    while ([topController presentedViewController])    topController = [topController presentedViewController];
    
    //  Returning topMost ViewController
    return topController;
}

+ (UIViewController*)currentViewControllerFromWindow:(UIWindow *)window{
    UIViewController *currentViewController = [self topMostControllerFromWindow:window];
    if([currentViewController isKindOfClass:[UITabBarController class]]){
        currentViewController = [(UITabBarController *)currentViewController selectedViewController];
    }
    while ([currentViewController isKindOfClass:[UINavigationController class]] && [(UINavigationController*)currentViewController topViewController])
        currentViewController = [(UINavigationController*)currentViewController topViewController];
    
    return currentViewController;
}


+ (UIViewController *)getCurrentController{
    UIWindow *window = [UIApplication sharedApplication].keyWindow;
    UIViewController *vc = [self currentViewControllerFromWindow:window];
    return vc;
}

- (UIViewController *)getControllerInNavPoolAheadBy:(NSUInteger)ahead{
    if (![self isPushed]) {
        //如果这个控制器不是被pop出来的
        return nil;
    }
    if (self.navigationController.viewControllers.count <ahead) {
        return nil;
    }
    NSUInteger index = [self.navigationController.viewControllers indexOfObject:self];
    UIViewController *controller = self.navigationController.viewControllers[index - ahead];
    return controller;
}

-(UIViewController *)lastConrollerInNavPool{
    return [self getControllerInNavPoolAheadBy:1];
}


-(BOOL)checkEntranceWithClsName:(NSString *)clsName{
    if ([self.lastConrollerInNavPool isKindOfClass:NSClassFromString(clsName)]) {
        return YES;
    }
    return NO;
}

- (void)popToViewControllerIdentifiedByClsNames:(NSArray *)controllers{
    [self popToViewControllerIdentifiedByClsNames:controllers failed:^{
        [self.navigationController popViewControllerAnimated:YES];
    }];
}

//跳转到数组中的控制器 数组元素越靠前优先级越高;
- (void)popToViewControllerIdentifiedByClsNames:(NSArray *)controllers failed:(void(^)(void))failed{
    __block UIViewController *desController;
    [controllers enumerateObjectsUsingBlock:^(id  _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
        [self getControllerInNavPopByByClsName:obj result:^(UIViewController *des) {
            if (des) {
                desController = des;
                [self.navigationController popToViewController:des animated:YES];
                *stop = YES;
            }
        }];
    }];
    if (!desController) {
        !failed?:failed();
    }
}

- (void)getControllerInNavPopByByClsName:(NSString *)clsName result:(void(^)(UIViewController *))result{
    __block UIViewController *desController;
    [self.navigationController.viewControllers enumerateObjectsUsingBlock:^(__kindof UIViewController * _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
        if ([obj.className isEqualToString:clsName]) {
            desController = obj;
            *stop = YES;
        }
    }];
    result(desController);
}

- (void)popToControllerWithBlackList:(NSArray *)blacklist{
    //退出当前控制器,如果是上层控制器是黑名单中的 就再向上退一层.
    UINavigationController *nav = self.navigationController;
    UIViewController *root = self;
    if(!nav){
        root = root.parentViewController;
        nav = root.parentViewController.navigationController;
    }
    NSEnumerator *enumerator = [nav.viewControllers reverseObjectEnumerator];
    UIViewController *desVc = nil;
    UIViewController *nextVc = nil;
    while (nextVc = [enumerator nextObject]) {
        __block BOOL inBlackList = NO;
        if (nextVc == self) {
            continue;
        }
        [blacklist enumerateObjectsUsingBlock:^(NSString *  _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
            if ([obj isEqualToString:nextVc.className]) {
                inBlackList = YES;
                *stop = YES;
            }
        }];

        if (!inBlackList) {
            desVc = nextVc;
            break;
        }
    }
    if (!desVc) {
        [nav popViewControllerAnimated:YES];
    }else{
        [nav popToViewController:desVc animated:YES];
    }
}


- (void)popToViewControllerIdentifiedByClsName:(NSString *)clsName{
    __block id target;
    [self.navigationController.viewControllers enumerateObjectsUsingBlock:^(__kindof UIViewController * _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
        if ([obj isKindOfClass:NSClassFromString(clsName)]) {
            target = obj;
        }
    }];
    if (target) {
        [self.navigationController popToViewController:target animated:YES];
    }else{
        [self.navigationController popViewControllerAnimated:YES];
    }
}


- (void)popToViewControllerAheadBy:(NSInteger)ahead{
    UIViewController *vc = [self getControllerInNavPoolAheadBy:ahead];
    if (vc) {
        [self.navigationController popToViewController:vc animated:YES];
    }else{
        NSLog(@"error: %s",__func__);
        [self.navigationController popViewControllerAnimated:YES];
    }
}

- (BOOL)isPushed{
    return self.navigationController.viewControllers.count >= 2  && [self.navigationController.viewControllers containsObject:self];
}
- (BOOL)isPrensented{
    return self.presentingViewController? YES:NO;
}

- (void)popOrDismiss{
    if ([self isPushed]) {
        [self.navigationController popViewControllerAnimated:YES];
    }else{
        [self dismissViewControllerAnimated:YES completion:nil];
    }
}

- (void)pushAndReplace:(UIViewController *)vc{
    [self.navigationController pushViewController:vc animated:YES];
    NSMutableArray *VCs = self.navigationController.viewControllers.mutableCopy;
    [VCs removeObject:self];
    self.navigationController.viewControllers = VCs.copy;
}

@end
