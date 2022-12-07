//
//  PackageManager.m
//  OfflinePackage
//
//  Created by 刘思源 on 2022/11/30.
//

#import "PackageManager.h"
#import <ZipArchive/ZipArchive.h>
#import "EnvModule.h"


@implementation PackageInfo

@end

@interface PackageManager ()<NSURLSessionTaskDelegate>

@end

@implementation PackageManager


NSString *kRequestFromNavtie = @"kRequestFromNavtie";


+ (void)getNewestPackage:(NSString *)packageId completedHandler:(void(^)(PackageInfo *))completedHandler{
    //下载
    NSString *requestUrl = [NSString stringWithFormat:@"http://%@/getNewestPackage",[EnvModule requestHost]];
    
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:requestUrl]];
    request.HTTPMethod = @"POST";
    [request addValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [request addValue:@"application/json" forHTTPHeaderField:@"Accept"];
    
    [NSURLProtocol setProperty:@"1" forKey:kRequestFromNavtie inRequest:request];
    
    NSDictionary *mapData = @{
        @"packageId":packageId
    };
    NSData *postData = [NSJSONSerialization dataWithJSONObject:mapData options:0 error:nil];
    [request setHTTPBody:postData];
    
    static dispatch_once_t onceToken;
    static NSURLSession *session;
    static PackageManager *manager;
    dispatch_once(&onceToken, ^{
        session = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration] delegate:self delegateQueue:NSOperationQueue.mainQueue];

    });
    
    NSURLSessionTask *task =  [session dataTaskWithRequest:request completionHandler:^(NSData * _Nullable data, NSURLResponse * _Nullable response, NSError * _Nullable error) {
        if (!error) {
            NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
            if(httpResponse.statusCode == 200){
                NSString *dataString = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                NSError *jsonError;
                NSData *objectData = [dataString dataUsingEncoding:NSUTF8StringEncoding];
                NSDictionary *json = [NSJSONSerialization JSONObjectWithData:objectData
                                                                     options:NSJSONReadingMutableContainers
                                                                       error:&jsonError];
                NSLog(@"~~ getNewestPackage: %@",dataString);
                PackageInfo *info = [PackageInfo new];
                info.version = json[@"version"];
                info.path = json[@"path"];
                info.packageId = packageId;
                
                if([info.version compare:[self currentVersionOfPackage:packageId]]){
                    //更新package
                    [self installPackage:info];
                }
                
            }else{
                
            }
        }else{
            NSLog(@"error %@",error);
        }
    }];
    //task.delegate = manager;
    [task resume];
}



+ (void )setCurrentVersion:(NSString *)version forPackage:(NSString *)packageId{
    NSString *key = [NSString stringWithFormat:@"%@_Version",packageId];
    [[NSUserDefaults standardUserDefaults] setObject:version forKey:key];
    [[NSUserDefaults standardUserDefaults] synchronize];
}

+ (NSString *)currentVersionOfPackage:(NSString *)packageId{
    NSString *key = [NSString stringWithFormat:@"%@_Version",packageId];
    return [[NSUserDefaults standardUserDefaults] objectForKey:key];
}

//+ (void)installAllPackages{
//
//
//    //创建压缩文件目录
//    NSString *zipFileDirPath = [documentPath stringByAppendingPathComponent:@"zipFiles"];
//    NSError *error;
//    [[NSFileManager defaultManager] createDirectoryAtPath:zipFileDirPath withIntermediateDirectories:YES attributes:nil error:&error];
//    //创建解压缩文件目录
//    NSString *unzipFilePath = [documentPath stringByAppendingPathComponent:@"unzipFiles"];
//    [[NSFileManager defaultManager] createDirectoryAtPath:unzipFilePath withIntermediateDirectories:YES attributes:nil error:nil];
//    if (error) {
//
//    }
//
//    NSArray *zips = [[NSBundle mainBundle] pathsForResourcesOfType:@"zip" inDirectory:@""];
//    ZipArchive *zipArchive = [[ZipArchive alloc] initWithFileManager:[NSFileManager defaultManager]];
//    for (NSString *zip in zips) {
//        NSString *zipFileName = zip.lastPathComponent;
//        NSString *copyedZipFilePath = [zipFileDirPath stringByAppendingPathComponent:zipFileName];
//        //按需复制
//        if (![[NSFileManager defaultManager] fileExistsAtPath:copyedZipFilePath]) {
//            [[NSFileManager defaultManager] copyItemAtPath:zip toPath:copyedZipFilePath error:nil];
//        }
//
//        //按需解压缩
//        if (![[NSFileManager defaultManager] fileExistsAtPath:[unzipFilePath stringByAppendingPathComponent:zipFileName]]) {
//            [zipArchive UnzipOpenFile:copyedZipFilePath];
//            [zipArchive UnzipFileTo:unzipFilePath overWrite:YES];
//        }
//    }
//}



+ (void)installPackage:(PackageInfo *)package{
    NSString *documentPath = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0];
    NSString *zipFileDirPath = [@[
        documentPath,
        @"zipFiles",
        package.packageId,
        package.version,
    ] componentsJoinedByString:@"/"];
    if(![[NSFileManager defaultManager] fileExistsAtPath:zipFileDirPath]){
        [[NSFileManager defaultManager] createDirectoryAtPath:zipFileDirPath withIntermediateDirectories:YES attributes:nil error:nil];
    }
    
    NSString *zipfilePath = [zipFileDirPath stringByAppendingPathComponent:package.path.lastPathComponent];
    if(![[NSFileManager defaultManager] fileExistsAtPath:zipfilePath]){
        //没有下载,去下载
        NSString *resourcePath = package.path;
        if(![package.path isAbsolutePath]){
            //相对路径拼接
            resourcePath = [NSString stringWithFormat:@"http://%@/@",[EnvModule requestHost],package.path];
        }
        [self downloadFile:[NSURL URLWithString:resourcePath] toPath:zipfilePath completion:^(NSString *path) {
            if(path){
                //下载成功,解压
                //按需解压缩
                //创建解压缩文件目录
                NSString *unzipFilePath = [@[documentPath,@"unzipFiles",package.packageId,package.version] componentsJoinedByString:@"/"];
                [[NSFileManager defaultManager] createDirectoryAtPath:unzipFilePath withIntermediateDirectories:YES attributes:nil error:nil];
                ZipArchive *zipArchive = [[ZipArchive alloc] initWithFileManager:[NSFileManager defaultManager]];
                if([zipArchive UnzipOpenFile:path]){
                    if([zipArchive UnzipFileTo:unzipFilePath overWrite:YES]){
                        NSLog(@"安装成功");
                        [self setCurrentVersion:package.version forPackage:package.packageId];
                    }else{
                        NSLog(@"安装失败");
                    }
                }else{
                    NSLog(@"打开失败");
                }
            }
        }];
    }
}
    
    
+ (void)downloadFile:(NSURL *)url toPath:(NSString *)path completion:(void (^)(NSString *))completionHandler{
    NSURLSessionDownloadTask *task =  [[NSURLSession sharedSession] downloadTaskWithURL:url completionHandler:^(NSURL * _Nullable location, NSURLResponse * _Nullable response, NSError * _Nullable error) {
        if(!error && location){
            NSURL *desUrl = [NSURL fileURLWithPath:path];
            [[NSFileManager defaultManager] copyItemAtURL:location toURL:desUrl error:nil];
            completionHandler(path);
        }else{
            completionHandler(nil);
        }
    }];
    [task resume];
    
}


@end
