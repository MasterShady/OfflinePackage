//
//  UIViewController+SYAdd.h
//  artapp
//
//  Created by 刘思源 on 17/8/16.
//  Copyright © 2017年 SJWL. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface UIViewController (SYAdd)

@property (nonatomic,strong) void(^sy_popAction)(void);

/* 获取当前的控制器**/
+ (UIViewController *)getCurrentController;

/* 获取navigationController 池中的上一个controller */
- (UIViewController *)lastConrollerInNavPool;

- (UIViewController *)getControllerInNavPoolAheadBy:(NSUInteger)ahead;

/* 检查入口是否为某个类*/
- (BOOL)checkEntranceWithClsName:(NSString *)clsName;

/* pop 到 navpool 中 类名 为cls 的控制器*/
- (void)popToViewControllerIdentifiedByClsName:(NSString *)clsName;

/* pop 到 navpool 中 往前第几个控制器 */
- (void)popToViewControllerAheadBy:(NSInteger)ahead;


/** 跳转到数组中的控制器 数组元素越靠前优先级越高 */
- (void)popToViewControllerIdentifiedByClsNames:(NSArray *)controllers failed:(void(^)(void))failed;
/** 跳转到数组中的控制器 数组元素越靠前优先级越高 如果找不到控制器 往上跳一层*/
- (void)popToViewControllerIdentifiedByClsNames:(NSArray *)controllers;

/**
 往上跳,黑名单中的控制器除外
 */
- (void)popToControllerWithBlackList:(NSArray *)blacklist;

/*不是很严谨*/
- (BOOL)isPushed;

- (BOOL)isPrensented;

- (void)popOrDismiss;

- (void)pushAndReplace:(UIViewController *)vc;

@end
