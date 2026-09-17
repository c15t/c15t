require 'xcodeproj'
require 'fileutils'

# Regenerates ios/C15tReactNative.xcodeproj, the project react-native.config.cjs points
# iOS at. It exists so the Swift half of the binding compiles for an iOS slice without
# an example app checkout, and so a hand-authored pbxproj stays reviewable as a diff.
#
# Run from ios/, with the xcodeproj gem CocoaPods already ships:
#
#   cd ios && GEM_HOME=/opt/homebrew/Cellar/cocoapods/1.17.0/libexec ruby support/gen-xcodeproj.rb
#
# One framework target. The consent core is *not* a sibling target here: a hand-built
# framework pair cannot import across targets, because a framework only vends a Swift
# module once it is a resolved package artifact. So the core comes in the same way an
# app gets it, as a local SwiftPM package reference at native/core-swift.
#
# The React-linked sources under ReactNative/ are deliberately absent. They import
# React and the `NativeC15tSpec` protocol that Codegen generates into the host app's
# ReactCodegen pod, so they compile only inside an app build, via the podspec or
# Package.swift's C15T_SPM_INCLUDE_RN path.

project_path = 'C15tReactNative.xcodeproj'
FileUtils.rm_rf(project_path)
project = Xcodeproj::Project.new(project_path)

BRIDGE_DIR = 'C15tReactNative/Bridge'
PRIVACY = 'C15tReactNative/Resources/Privacy.xcprivacy'
UMBRELLA = 'C15tReactNative/C15tReactNative.h'
# Relative to this project directory (packages/react-native/ios).
CORE_PACKAGE = '../../../native/core-swift'
CORE_PRODUCT = 'C15tCore'

target = project.new_target(:framework, 'C15tReactNative', :ios, '16.4')

group = project.main_group.new_group('Bridge')
Dir.glob(File.join(BRIDGE_DIR, '*.swift')).sort.each do |file|
  target.add_file_references([group.new_reference(file)])
end

resources = project.main_group.new_group('Resources')
target.add_resources([resources.new_reference(PRIVACY)])

# A public umbrella header plus DEFINES_MODULE is what makes Xcode emit the module map;
# without one the framework cannot be imported even though it builds.
header_group = project.main_group.new_group('SupportingFiles')
umbrella_build_file = target.headers_build_phase.add_file_reference(header_group.new_reference(UMBRELLA))
umbrella_build_file.settings = { 'ATTRIBUTES' => ['Public'] }

core_reference = project.new(Xcodeproj::Project::Object::XCLocalSwiftPackageReference)
core_reference.relative_path = CORE_PACKAGE
# `package_references` sits on the root object, the same place `targets` does.
project.root_object.package_references << core_reference

core_dependency = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
core_dependency.product_name = CORE_PRODUCT
core_dependency.package = core_reference
target.package_product_dependencies << core_dependency

settings = {
  'SWIFT_VERSION' => '5.9',
  'IPHONEOS_DEPLOYMENT_TARGET' => '16.4',
  'GENERATE_INFOPLIST_FILE' => 'YES',
  'SKIP_INSTALL' => 'YES',
  'DEFINES_MODULE' => 'YES',
  'ENABLE_BITCODE' => 'NO',
  'CODE_SIGNING_ALLOWED' => 'NO',
  'CODE_SIGNING_REQUIRED' => 'NO',
  # Nothing in this target may reach UIKit or React: the core stays UI-free per
  # native/CONTRACT.md, and the React-linked half lives behind the podspec.
  'OTHER_SWIFT_FLAGS' => '$(inherited) -warnings-as-errors',
}

[project, target].each do |object|
  object.build_configurations.each do |config|
    settings.each { |key, value| config.build_settings[key] = value }
    config.build_settings.delete('PRODUCT_BUNDLE_IDENTIFIER')
  end
end

project.save

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(project_path, 'C15tReactNative', true)

puts "generated #{project_path} (core package: #{CORE_PACKAGE}, product: #{CORE_PRODUCT})"
