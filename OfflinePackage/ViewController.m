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

@interface ViewController ()<WKNavigationDelegate>

@property (nonatomic, strong) WKWebView *webView;

@property (nonatomic, strong) AFHTTPSessionManager *manager;

@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    UIButton *btn = [[UIButton alloc] initWithFrame:CGRectMake(0, 100, 375, 20)];
    [self.view addSubview:btn];
    btn.backgroundColor = UIColor.greenColor;
    [btn setTitle:@"Load Pakage" forState:UIControlStateNormal];
    [btn addTarget:self action:@selector(loadPackage) forControlEvents:UIControlEventTouchUpInside];
    
    
    UIButton *btn1 = [[UIButton alloc] initWithFrame:CGRectMake(0, 200, 375, 20)];
    [self.view addSubview:btn1];
    btn1.backgroundColor = UIColor.greenColor;
    [btn1 setTitle:@"Load Webpage" forState:UIControlStateNormal];
    [btn1 addTarget:self action:@selector(loadWebPage) forControlEvents:UIControlEventTouchUpInside];
    
    
    UIButton *btn2 = [[UIButton alloc] initWithFrame:CGRectMake(0, 300, 375, 20)];
    [self.view addSubview:btn2];
    btn2.backgroundColor = UIColor.greenColor;
    [btn2 setTitle:@"Just Post" forState:UIControlStateNormal];
    [btn2 addTarget:self action:@selector(justPost) forControlEvents:UIControlEventTouchUpInside];
    
  
}

- (void)loadPackage{
    OfflinePackageController *vc = [OfflinePackageController controllerWithPackageId:@"v6"];
    [self.navigationController pushViewController:vc animated:YES];
}

- (void)loadWebPage{
    OfflinePackageController *vc = [[OfflinePackageController alloc] initWithUrl:@"http://192.168.33.50:8000/"];
    [self.navigationController pushViewController:vc animated:YES];
}

- (void)justPost{
    if(!_manager){
        _manager = [AFHTTPSessionManager manager];
    }
    
    [_manager GET:@"http://192.168.33.50:8000/testCookie" parameters:nil headers:nil progress:nil success:^(NSURLSessionDataTask * _Nonnull task, id  _Nullable responseObject) {
        
        NSLog(@"~~ %@",responseObject);
    } failure:^(NSURLSessionDataTask * _Nullable task, NSError * _Nonnull error) {
        
    }];
}


@end
