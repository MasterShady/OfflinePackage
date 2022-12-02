//
//  PackageManager.h
//  OfflinePackage
//
//  Created by 刘思源 on 2022/11/30.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface PackageManager : NSObject


+ (void)installAllPackages;


+ (void)installPackage:(NSString *)packageId;

@end

NS_ASSUME_NONNULL_END
