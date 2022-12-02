//
//  OfflinePackageController.h
//  OfflinePackage
//
//  Created by 刘思源 on 2022/11/30.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface OfflinePackageController : UIViewController

+ (instancetype)controllerWithPackageId:(NSString *)packageId;

- (instancetype)initWithUrl:(NSString *)url;

- (instancetype)initWithPackageId:(NSString *)packageId;

@end

NS_ASSUME_NONNULL_END
