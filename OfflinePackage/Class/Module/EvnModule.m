//
//  EvnModule.m
//  OfflinePackage
//
//  Created by 刘思源 on 2022/12/5.
//

#import "EvnModule.h"

@interface EvnModule ()

@property (nonatomic, weak) KKWebView *webView;

@end


@implementation EvnModule


- (instancetype)initWithEngine:(KKJSBridgeEngine *)engine context:(id)context{
    if (self = [super init]) {
        _webView = context;
    }

    return self;
}

+ (NSString *)ducumentPath{
    return NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0];
}

+ (NSArray *)allNSHTTPCookies{
    return [NSHTTPCookieStorage sharedHTTPCookieStorage].cookies;
}

+ (void )printAllWKCookieIfCould:(WKWebView *)webView{
    NSDateFormatter *dateFormat = [[NSDateFormatter alloc] init];
    [dateFormat setDateFormat:@"yyyy/MM/dd HH:mm"];
    [webView.configuration.websiteDataStore.httpCookieStore getAllCookies:^(NSArray<NSHTTPCookie *> * _Nonnull cookies) {
        NSLog(@"===========wk cookies start==========\n");
        for (NSHTTPCookie *cookie in cookies) {
            NSLog(@"%@=%@ \n date:%@ \n domain:%@",cookie.name,cookie.value, [dateFormat stringFromDate:cookie.expiresDate],cookie.domain);
        }
        NSLog(@"===========wk cookies end==========\n");
    }];
    
    
    // WORKAROUND: Force the creation of the datastore by calling a method on it.
//    [webView.configuration.websiteDataStore fetchDataRecordsOfTypes:[NSSet<NSString *> setWithObject:WKWebsiteDataTypeCookies]
//                                                  completionHandler:^(NSArray<WKWebsiteDataRecord *> *records) {}];
}

// 模块名称
+ (nonnull NSString *)moduleName {
    return @"EvnModule";
}

+ (BOOL)isSingleton {
    return YES;
}

// 模块提供的方法
- (void)getRequestHost:(KKJSBridgeEngine *)engine params:(NSDictionary *)params responseCallback:(void (^)(NSDictionary *responseData))responseCallback {
    responseCallback ? responseCallback(@{@"host":[EvnModule requestHost]}) : nil;
}


-(void)goBack:(KKJSBridgeEngine *)engine params:(NSDictionary *)params responseCallback:(void (^)(NSDictionary *responseData))responseCallback {
    if([_webView canGoBack]){
        [_webView goBack];
    }
    !responseCallback ?:responseCallback(nil);
    
}


+ (NSString *)requestHost{
    NSString *host = [[NSUserDefaults standardUserDefaults] stringForKey:@"host"];
    if (!host){
        host = @"127.0.0.1:8000";
    }
    return host;
}

+ (void)setRequestHost:(NSString *)host{
    [[NSUserDefaults standardUserDefaults] setObject:host forKey:@"host"];
}

@end
