//
//  PackageManager.h
//  OfflinePackage
//
//  Created by 刘思源 on 2022/11/30.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN


extern NSString *kRequestFromNavtie;

@interface PackageInfo : NSObject

@property (nonatomic, strong) NSString *packageId;

@property (nonatomic, strong) NSString *version;

/// 资源路径
@property (nonatomic, strong) NSString *path;

/// 本地解压路径
@property (nonatomic, strong) NSString *localInstalledPath;

/// 本地下载路径
@property (nonatomic, strong) NSString *localPath;


@end

@interface PackageManager : NSObject


+ (void)installAllPackages;


+ (void)installPackage:(PackageInfo *)packageId;


+ (void)getNewestPackage:(NSString *)packageId completedHandler:(void(^)(PackageInfo *))completedHandler;

+ (NSString *)currentVersionOfPackage:(NSString *)packageId;

@end

NS_ASSUME_NONNULL_END
