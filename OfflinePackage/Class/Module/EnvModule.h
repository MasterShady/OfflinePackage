//
//  EvnModule.h
//  OfflinePackage
//
//  Created by 刘思源 on 2022/12/5.
//

#import <Foundation/Foundation.h>
#import <KKJSBridge/KKJSBridge.h>
#import <WebKit/WebKit.h>

NS_ASSUME_NONNULL_BEGIN


@interface EnvModule : NSObject <KKJSBridgeModule>

+ (NSString *)requestHost;

+ (void)setRequestHost:(NSString *)host;


#pragma mark - debug tools
+ (NSArray *)allNSHTTPCookies;

+ (void *)printAllWKCookieIfCould:(WKWebView *)webView;

@end

NS_ASSUME_NONNULL_END
