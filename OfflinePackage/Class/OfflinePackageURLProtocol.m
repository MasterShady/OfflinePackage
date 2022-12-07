//
//  OfflinePackageURLProtocol.m
//  OfflinePackage
//
//  Created by 刘思源 on 2022/11/29.
//

#import "OfflinePackageURLProtocol.h"
#import <MobileCoreServices/MobileCoreServices.h>
#import "PackageManager.h"

static NSString *kOfflinePackageDidHandleRequest = @"kOfflinePackageDidHandleRequest";


@interface OfflinePackageURLProtocol ()<NSURLSessionDelegate>

@property (atomic,strong,readwrite) NSURLSessionDataTask *task;
@property (nonatomic,strong) NSURLSession *session;
@property (nonatomic, strong) NSOperationQueue *queue;

@end


@implementation OfflinePackageURLProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest *)request
{
    NSString *scheme = [[request URL] scheme];
    // 判断是否需要进入自定义加载器
    if ([scheme caseInsensitiveCompare:@"http"] == NSOrderedSame ||
        [scheme caseInsensitiveCompare:@"https"] == NSOrderedSame)
    {
        //看看是否已经处理过了，防止无限循环
        if ([NSURLProtocol propertyForKey:kOfflinePackageDidHandleRequest inRequest:request]) {
            return NO;
        }
//        if ([NSURLProtocol propertyForKey:kRequestFromNavtie inRequest:request]) {
//            return NO;
//        }
    }
    
    return YES;
}

+ (NSURLRequest *) canonicalRequestForRequest:(NSURLRequest *)request {
    
    NSMutableURLRequest *mutableReqeust = [request mutableCopy];
    // 执行自定义操作，例如添加统一的请求头等
    return mutableReqeust;
}



- (void)startLoading{
    NSLog(@"~~ OfflinePackageURL handle request: %@",self.request.URL);
    NSURLRequest *originRequest = self.request;
    
    NSMutableURLRequest *mutableReqeust = [originRequest mutableCopy];

    // 标示改request已经处理过了，防止无限循环
    [NSURLProtocol setProperty:@YES forKey:kOfflinePackageDidHandleRequest inRequest:mutableReqeust];
    
    if ([self.request.URL.host containsString:@".package"]) {
        //本地
        NSString *packageId = [self.request.URL.host componentsSeparatedByString:@"."][0];
        NSString *relativePath;
        if (self.request.URL.pathExtension.length > 0) {
            relativePath = self.request.URL.relativePath;
        }else{
            if([self.request.URL.lastPathComponent isEqualToString:@"/"]){
                relativePath = @"index.html";
            }else{
                relativePath = [NSString stringWithFormat:@"%@.html",self.request.URL.lastPathComponent];
            }
        }
        NSString *version = [PackageManager currentVersionOfPackage:packageId];
        NSString *filePath = [@[
            NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0],
            @"unzipFiles",
            packageId,
            version,
            relativePath
        ] componentsJoinedByString:@"/"];

        NSData *data = [NSData dataWithContentsOfFile:filePath];;
        NSURLResponse *res = [[NSURLResponse alloc] initWithURL:self.request.URL MIMEType:[self getMimeTypeWithFilePath:filePath] expectedContentLength:data.length textEncodingName:nil];
        [self.client URLProtocol:self didReceiveResponse:res cacheStoragePolicy:NSURLCacheStorageNotAllowed];
        [self.client URLProtocol:self didLoadData:data];
        [self.client URLProtocolDidFinishLoading:self];
        
    }else{
        NSURLSessionConfiguration *configure = [NSURLSessionConfiguration defaultSessionConfiguration];
        self.session  = [NSURLSession sessionWithConfiguration:configure delegate:self delegateQueue:self.queue];
        self.task = [self.session dataTaskWithRequest:mutableReqeust];
        [self.task resume];
    }
}

- (NSString *)getMimeTypeWithFilePath:(NSString *)filePath{
    CFStringRef pathExtension = (__bridge_retained CFStringRef)[filePath pathExtension];
    CFStringRef type = UTTypeCreatePreferredIdentifierForTag(kUTTagClassFilenameExtension, pathExtension, NULL);
    CFRelease(pathExtension);
    //The UTI can be converted to a mime type:
    NSString *mimeType = (__bridge_transfer NSString *)UTTypeCopyPreferredTagWithClass(type, kUTTagClassMIMEType);
    if (type != NULL)
        CFRelease(type);
    return mimeType;
}



- (void)stopLoading
{
    [self.session invalidateAndCancel];
    self.session = nil;
}




#pragma mark - NSURLSessionDelegate

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{
    if (error != nil) {
        [self.client URLProtocol:self didFailWithError:error];
    }else
    {
        [self.client URLProtocolDidFinishLoading:self];
    }
}

- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask
didReceiveResponse:(NSURLResponse *)response
 completionHandler:(void (^)(NSURLSessionResponseDisposition disposition))completionHandler
{
    [self.client URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
    
    completionHandler(NSURLSessionResponseAllow);
}

- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveData:(NSData *)data
{
    [self.client URLProtocol:self didLoadData:data];
}

- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask willCacheResponse:(NSCachedURLResponse *)proposedResponse completionHandler:(void (^)(NSCachedURLResponse * _Nullable))completionHandler
{
    completionHandler(proposedResponse);
}


- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task
                            didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
 completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential * _Nullable credential))completionHandler{
    
    
    NSURLSessionAuthChallengeDisposition disposition = NSURLSessionAuthChallengeUseCredential;
    NSURLCredential *credential = [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust];
        
        //最后调用 completionHandler 继续执行操作
        if (completionHandler) {

            completionHandler(disposition, credential);

        }
}

//TODO: 重定向
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task willPerformHTTPRedirection:(NSHTTPURLResponse *)response newRequest:(NSURLRequest *)newRequest completionHandler:(void (^)(NSURLRequest *))completionHandler
{
    NSMutableURLRequest*    redirectRequest;
    redirectRequest = [newRequest mutableCopy];
    [[self class] removePropertyForKey:kOfflinePackageDidHandleRequest inRequest:redirectRequest];
    [[self client] URLProtocol:self wasRedirectedToRequest:redirectRequest redirectResponse:response];
    
    [self.task cancel];
    [[self client] URLProtocol:self didFailWithError:[NSError errorWithDomain:NSCocoaErrorDomain code:NSUserCancelledError userInfo:nil]];
}


#pragma mark - Getter
- (NSOperationQueue *)queue
{
    if (!_queue) {
        _queue = [[NSOperationQueue alloc] init];
    }
    return _queue;
}

@end
