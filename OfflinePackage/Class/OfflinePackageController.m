//
//  OfflinePackageController.m
//  OfflinePackage
//
//  Created by 刘思源 on 2022/11/30.
//

#import "OfflinePackageController.h"
#import "OfflinePackageURLProtocol.h"
#import <WebKit/WebKit.h>
#import <KKJSBridge/KKJSBridge.h>
#import <AFNetworking/AFNetworking.h>

@interface OfflinePackageController ()<WKNavigationDelegate>

@property (nonatomic, strong) KKWebView *webView;
@property (nonatomic, strong) NSString *url;
@property (nonatomic, strong) KKJSBridgeEngine *jsBridgeEngine;

@end

@implementation OfflinePackageController

+(void)load{

    //KKJSBridge 中是按需注册的, 我这里提前注册观察一下
    //[NSURLProtocol registerClass:NSClassFromString(@"KKJSBridgeAjaxURLProtocol")];
    
    __block id observer = [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidFinishLaunchingNotification object:nil queue:nil usingBlock:^(NSNotification * _Nonnull note) {
        Class cls = NSClassFromString(@"WKBrowsingContextController");
        SEL sel = NSSelectorFromString(@"registerSchemeForCustomProtocol:");
        // [(id)cls performSelector:sel withObject:@"CustomProtocol"];
        [(id)cls performSelector:sel withObject:@"http"];
        [(id)cls performSelector:sel withObject:@"https"];
        
        [NSURLProtocol registerClass:[OfflinePackageURLProtocol class]];
        
        [self prepareWebView];
        [[NSNotificationCenter defaultCenter] removeObserver:observer];
    }];
    
    //[self prepareWebView];
    
}


+ (instancetype)controllerWithPackageId:(NSString *)packageId{
    OfflinePackageController *vc = [[OfflinePackageController alloc] initWithPackageId:packageId];
    return vc;
}

- (instancetype)initWithUrl:(NSString *)url{
    if (self = [super init]) {
        _url = url;
        [self commonInit];
    }
    return self;
}

- (instancetype)initWithPackageId:(NSString *)packageId{
    if (self = [super init]) {
        _url = [NSString stringWithFormat:@"http://%@.package",packageId];
        [self commonInit];
    }
    return self;
}





+ (void)prepareWebView{
    [[KKWebViewPool sharedInstance] enqueueWebViewWithClass:KKWebView.class];
    KKJSBridgeConfig.ajaxDelegateManager = (id<KKJSBridgeAjaxDelegateManager>)self;
}

- (void)commonInit{
    _webView = [[KKWebViewPool sharedInstance] dequeueWebViewWithClass:KKWebView.class webViewHolder:self];
    
    _webView.navigationDelegate = self;
    _jsBridgeEngine = [KKJSBridgeEngine bridgeForWebView:self.webView];
    _jsBridgeEngine.config.enableAjaxHook = NO;
    _jsBridgeEngine.bridgeReadyCallback = ^(KKJSBridgeEngine * _Nonnull engine) {
        NSLog(@"~~ bridgeReadyCallback");
        NSString *event = @"customEvent";
        NSDictionary *data = @{
            @"action": @"testAction",
            @"data": @YES
        };
        [engine dispatchEvent:event data:data];
    };
    
    //[self compatibleWebViewJavascriptBridge];
    //[self registerModule];
    [self loadRequest];
    
}


- (void)viewDidLoad{
    [super viewDidLoad];
    [self configSubViews];
}

- (void)configSubViews{
    self.webView.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    self.navigationItem.leftBarButtonItem = [[UIBarButtonItem alloc] initWithTitle:@"<返回" style:UIBarButtonItemStyleDone target:self action:@selector(onClickBack)];
    
    self.navigationItem.rightBarButtonItem = [[UIBarButtonItem alloc] initWithTitle:@"刷新" style:UIBarButtonItemStyleDone target:self action:@selector(onRefresh)];
    
    self.view.backgroundColor = [UIColor whiteColor];
    [self.view addSubview:self.webView];
    self.webView.frame = [UIScreen mainScreen].bounds;
    self.webView.translatesAutoresizingMaskIntoConstraints = NO;
    
    NSMutableArray *constraints = [NSMutableArray array];
    [constraints addObject:[NSLayoutConstraint constraintWithItem:self.webView attribute:NSLayoutAttributeLeading relatedBy:NSLayoutRelationEqual toItem:self.view attribute:NSLayoutAttributeLeading multiplier:1 constant:0]];
    [constraints addObject:[NSLayoutConstraint constraintWithItem:self.webView attribute:NSLayoutAttributeTrailing relatedBy:NSLayoutRelationEqual toItem:self.view attribute:NSLayoutAttributeTrailing multiplier:1 constant:0]];
    [constraints addObject:[NSLayoutConstraint constraintWithItem:self.webView attribute:NSLayoutAttributeBottom relatedBy:NSLayoutRelationEqual toItem:self.view attribute:NSLayoutAttributeBottom multiplier:1 constant:0]];
    [constraints addObject:[NSLayoutConstraint constraintWithItem:self.webView attribute:NSLayoutAttributeTop relatedBy:NSLayoutRelationEqual toItem:self.view.safeAreaLayoutGuide attribute:NSLayoutAttributeTop multiplier:1 constant:0]];
    [self.view addConstraints:constraints];
    
}

- (void)onClickBack {
    if ([self.webView canGoBack]) {
        [self.webView goBack];
    } else {
        [self.navigationController popViewControllerAnimated:YES];
    }
}


#pragma mark - 请求
- (void)loadRequest {
    if (!self.url) {
        return;
    }
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:self.url]];
    [self.webView loadRequest:request];
}

- (void)onRefresh{
    [self.webView reload];
}


#pragma mark - KKJSBridgeAjaxDelegateManager

+ (NSURLSessionDataTask *)dataTaskWithRequest:(NSURLRequest *)request callbackDelegate:(NSObject<KKJSBridgeAjaxDelegate> *)callbackDelegate {
    return [[self ajaxSesstionManager] dataTaskWithRequest:request uploadProgress:nil downloadProgress:nil completionHandler:^(NSURLResponse * _Nonnull response, id  _Nullable responseObject, NSError * _Nullable error) {
        // 处理响应数据
        [callbackDelegate JSBridgeAjax:callbackDelegate didReceiveResponse:response];
        if ([responseObject isKindOfClass:NSData.class]) {
            [callbackDelegate JSBridgeAjax:callbackDelegate didReceiveData:responseObject];
        } else if ([responseObject isKindOfClass:NSDictionary.class]) {
            NSData *responseData = [NSJSONSerialization dataWithJSONObject:responseObject options:0 error:nil];
            [callbackDelegate JSBridgeAjax:callbackDelegate didReceiveData:responseData];
        } else {
            NSData *responseData = [NSJSONSerialization dataWithJSONObject:@{} options:0 error:nil];
            [callbackDelegate JSBridgeAjax:callbackDelegate didReceiveData:responseData];
        }
        if (responseObject) {
            error = nil;
        }
        [callbackDelegate JSBridgeAjax:callbackDelegate didCompleteWithError:error];
    }];
}


+ (AFHTTPSessionManager *)ajaxSesstionManager {
    static AFHTTPSessionManager *instance;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[AFHTTPSessionManager alloc] initWithSessionConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]];
        instance.requestSerializer = [AFHTTPRequestSerializer serializer];
        instance.responseSerializer = [AFHTTPResponseSerializer serializer];
    });
    
    return instance;
}


#pragma mark - WKNavigationDelegate
// 在发送请求之前，决定是否跳转
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    if ([navigationAction.request.URL.absoluteString containsString:@"https://__bridge_loaded__"]) {// 防止 WebViewJavascriptBridge 注入
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }
   
    decisionHandler(WKNavigationActionPolicyAllow);
}

// 页面跳转完成时调用
- (void)webView:(WKWebView *)webView didFinishNavigation:(null_unspecified WKNavigation *)navigation {
    self.navigationItem.title = webView.title;
}

- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    /*
     解决内存过大引起的白屏问题
     */
    [self.webView reload];
}








@end
