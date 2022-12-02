//
//  PackageManager.m
//  OfflinePackage
//
//  Created by 刘思源 on 2022/11/30.
//

#import "PackageManager.h"
#import <ZipArchive/ZipArchive.h>

@implementation PackageManager

//+ (void)installAllPackages{
//
//}

+ (void)installAllPackages{
    NSString *documentPath = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0];
    NSLog(@"DOCPATH\n%@",documentPath);
    
    //创建压缩文件目录
    NSString *zipFileDirPath = [documentPath stringByAppendingPathComponent:@"zipFiles"];
    NSError *error;
    [[NSFileManager defaultManager] createDirectoryAtPath:zipFileDirPath withIntermediateDirectories:YES attributes:nil error:&error];
    //创建解压缩文件目录
    NSString *unzipFilePath = [documentPath stringByAppendingPathComponent:@"unzipFiles"];
    [[NSFileManager defaultManager] createDirectoryAtPath:unzipFilePath withIntermediateDirectories:YES attributes:nil error:nil];
    if (error) {
        
    }
    
    NSArray *zips = [[NSBundle mainBundle] pathsForResourcesOfType:@"zip" inDirectory:@""];
    ZipArchive *zipArchive = [[ZipArchive alloc] initWithFileManager:[NSFileManager defaultManager]];
    for (NSString *zip in zips) {
        NSString *zipFileName = zip.lastPathComponent;
        NSString *copyedZipFilePath = [zipFileDirPath stringByAppendingPathComponent:zipFileName];
        //按需复制
        if (![[NSFileManager defaultManager] fileExistsAtPath:copyedZipFilePath]) {
            [[NSFileManager defaultManager] copyItemAtPath:zip toPath:copyedZipFilePath error:nil];
        }
        
        //按需解压缩
        if (![[NSFileManager defaultManager] fileExistsAtPath:[unzipFilePath stringByAppendingPathComponent:zipFileName]]) {
            [zipArchive UnzipOpenFile:copyedZipFilePath];
            [zipArchive UnzipFileTo:unzipFilePath overWrite:YES];
        }
    }
}

@end
