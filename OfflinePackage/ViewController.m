//
//  ViewController.m
//  OfflinePackage
//
//  Created by 刘思源 on 2022/11/23.
//

#import "ViewController.h"
#import <WebKit/WebKit.h>
#import "OfflinePackageController.h"
#import <AFNetworking/AFNetworking.h>
#import "EvnModule.h"

static NSString *appId = @"v10";

@interface ViewController ()<WKNavigationDelegate,UITextFieldDelegate>

@property (nonatomic, strong) WKWebView *webView;

@property (nonatomic, strong) AFHTTPSessionManager *manager;

@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    UITextField *tf = [[UITextField alloc] initWithFrame:CGRectMake(0, 100, 375, 40)];
    tf.backgroundColor = UIColor.cyanColor;
    
    [self.view addSubview:tf];
    tf.leftView = ({
        UILabel *label = [UILabel new];
        label.text = @"设置请求地址https://";
        label.backgroundColor = [UIColor greenColor];
        label.frame = CGRectMake(0, 0, 40, 20);
        label;
    });
    
    tf.text = [EvnModule requestHost];
    tf.delegate = self;
    tf.leftViewMode = UITextFieldViewModeAlways;
    
    UIButton *btn = [[UIButton alloc] initWithFrame:CGRectMake(0, 200, 375, 40)];
    [self.view addSubview:btn];
    btn.backgroundColor = UIColor.greenColor;
    [btn setTitle:@"Load Package" forState:UIControlStateNormal];
    [btn addTarget:self action:@selector(loadPackage) forControlEvents:UIControlEventTouchUpInside];
    
    
    UIButton *btn1 = [[UIButton alloc] initWithFrame:CGRectMake(0, 300, 375, 40)];
    [self.view addSubview:btn1];
    btn1.backgroundColor = UIColor.greenColor;
    [btn1 setTitle:@"Load Webpage" forState:UIControlStateNormal];
    [btn1 addTarget:self action:@selector(loadWebPage) forControlEvents:UIControlEventTouchUpInside];
    
    
    UIButton *btn2 = [[UIButton alloc] initWithFrame:CGRectMake(0, 400, 375, 40)];
    [self.view addSubview:btn2];
    btn2.backgroundColor = UIColor.greenColor;
    [btn2 setTitle:@"Just Post" forState:UIControlStateNormal];
    [btn2 addTarget:self action:@selector(justPost) forControlEvents:UIControlEventTouchUpInside];
    
    
    UIButton *btn3 = [[UIButton alloc] initWithFrame:CGRectMake(0, 500, 375, 40)];
    [self.view addSubview:btn3];
    btn3.backgroundColor = UIColor.greenColor;
    [btn3 setTitle:@"User Make Cookie" forState:UIControlStateNormal];
    [btn3 addTarget:self action:@selector(makeCookie:) forControlEvents:UIControlEventTouchUpInside];
  
}

- (void)makeCookie:(UIButton *)sender{
    NSHTTPCookie *cookie = [[NSHTTPCookie alloc] initWithProperties:@{
        NSHTTPCookieName:@"cookie_form_user",
        NSHTTPCookieValue:@"1",
        NSHTTPCookieDomain:[NSString stringWithFormat:@"%@.package",appId],
        NSHTTPCookieExpires:[NSDate dateWithTimeIntervalSinceNow:86400],
        NSHTTPCookiePath: @"/",
    }];
    [[NSHTTPCookieStorage sharedHTTPCookieStorage] setCookie:cookie];
    [sender setTitle:@"set user cookie done" forState:UIControlStateNormal];
    
}

- (void)textFieldDidEndEditing:(UITextField *)textField{
    if (textField.text.length) {
        [EvnModule setRequestHost:textField.text];
        [textField endEditing:YES];
        //return YES;
    }
    textField.text = [EvnModule requestHost];
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField{
    [textField endEditing:YES];
//    if (textField.text.length) {
//        [EvnModule setRequestHost:textField.text];
//        [textField endEditing:YES];
//        return YES;
//    }
//    textField.text = [EvnModule requestHost];
    return NO;
}

- (void)loadPackage{
    OfflinePackageController *vc = [OfflinePackageController controllerWithPackageId:appId];
    [self.navigationController pushViewController:vc animated:YES];
}

- (void)loadWebPage{
    
    OfflinePackageController *vc = [[OfflinePackageController alloc] initWithUrl:[NSString stringWithFormat:@"http://%@/",[EvnModule requestHost]]];
    [self.navigationController pushViewController:vc animated:YES];
}

- (void)justPost{
    if(!_manager){
        _manager = [AFHTTPSessionManager manager];
    }
    
    [_manager GET:[NSString stringWithFormat:@"http://%@/testCookie",[EvnModule requestHost]] parameters:nil headers:nil progress:nil success:^(NSURLSessionDataTask * _Nonnull task, id  _Nullable responseObject) {
        
        NSLog(@"~~ %@",responseObject);
    } failure:^(NSURLSessionDataTask * _Nullable task, NSError * _Nonnull error) {
        
    }];
}


@end
