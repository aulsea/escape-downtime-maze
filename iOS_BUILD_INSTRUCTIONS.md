# iOS IPA Build Instructions for Zephyrus Challenge

## 📱 Building IPA for iPad Distribution

This guide will help you create an IPA file for iPad installation of the Zephyrus Challenge game.

## ⚠️ Requirements

### System Requirements
- **macOS** (iOS apps can only be built on Mac)
- **Xcode** (latest version from App Store)
- **Node.js** (v16 or later)
- **CocoaPods** (`sudo gem install cocoapods`)

### Apple Developer Account
- **Apple Developer Program** membership ($99/year)
- Required for:
  - Code signing
  - App Store distribution
  - TestFlight beta testing
  - Ad-hoc distribution (direct IPA installation)

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install CocoaPods (if not already installed)
sudo gem install cocoapods
```

### 2. Initialize iOS Project
```bash
# Add iOS platform to Capacitor
npm run ios:prepare

# This creates the iOS project in ios/ directory
```

### 3. Configure iOS Project
```bash
# Open the iOS project in Xcode
npm run ios:open
```

### 4. Configure in Xcode

#### Bundle Identifier & Team
1. Select the project root in Xcode navigator
2. Under "TARGETS" → "App":
   - **Bundle Identifier**: `com.intelssoft.zephyruschallenge`
   - **Team**: Select your Apple Developer Team
   - **Deployment Target**: iOS 13.0 or later

#### Signing & Capabilities
1. Go to "Signing & Capabilities" tab
2. Enable "Automatically manage signing"
3. Select your development team
4. Ensure provisioning profile is configured

#### App Icons & Launch Screen
1. **App Icons**: Add app icons to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Required sizes: 29pt, 40pt, 60pt, 76pt, 83.5pt (all @1x, @2x, @3x variants)
2. **Launch Screen**: Customize `ios/App/App/Base.lproj/LaunchScreen.storyboard`

## 🏗️ Building IPA

### For Development/Testing (No App Store)
```bash
# Build for device testing
npm run ios:build

# Or build directly in Xcode:
# Product → Archive → Distribute App → Development
```

### For Distribution
1. In Xcode: **Product** → **Archive**
2. When archive completes → **Distribute App**
3. Choose distribution method:
   - **App Store Connect** (for App Store)
   - **Ad Hoc** (for direct installation)
   - **Enterprise** (if you have enterprise account)
   - **Development** (for testing)

### Manual IPA Creation
1. After successful archive, right-click in Organizer
2. Select "Show in Finder"
3. Right-click the `.xcarchive` file
4. "Show Package Contents"
5. Navigate to `Products/Applications/`
6. Create folder, add the `.app` file
7. Compress to create IPA

## 📲 Installing IPA on iPad

### Method 1: TestFlight (Recommended)
1. Upload to App Store Connect
2. Add beta testers
3. Testers install via TestFlight app

### Method 2: Direct Installation
1. Use **Apple Configurator 2** (Mac App Store)
2. Connect iPad via USB
3. Drag IPA file to install

### Method 3: Over-the-Air (OTA)
1. Host IPA on HTTPS server
2. Create `.plist` manifest file
3. Access via Safari: `itms-services://?action=download-manifest&url=https://yourserver.com/manifest.plist`

## 🔧 Troubleshooting

### Common Issues

#### "Unable to install app"
- Check Bundle ID matches provisioning profile
- Ensure device UDID is registered (for ad-hoc)
- Verify iOS version compatibility

#### "Untrusted Developer"
- Go to Settings → General → Device Management
- Trust the developer profile

#### Build Errors
```bash
# Clean and rebuild
npm run sync
cd ios && xcodebuild clean
```

#### Code Signing Issues
- Verify Apple Developer account status
- Check provisioning profiles in Xcode
- Ensure certificates are valid

## 🌐 Alternative Solutions (No Mac Required)

If you don't have access to macOS:

### 1. GitHub Actions (Cloud Build)
- Set up automated iOS builds
- Requires Apple Developer account
- Free tier available

### 2. Ionic AppFlow
- Cloud-based build service
- Paid service but handles all complexity
- No Mac required

### 3. Codemagic
- CI/CD for mobile apps
- Free tier available
- Supports Capacitor projects

### 4. Bitrise
- Mobile DevOps platform
- Free tier for open source
- macOS build environments

## 📋 Quick Checklist

- [ ] macOS with Xcode installed
- [ ] Apple Developer Program membership
- [ ] Node.js and dependencies installed
- [ ] iOS project initialized (`npm run ios:prepare`)
- [ ] Bundle ID and team configured in Xcode
- [ ] App icons added
- [ ] Code signing configured
- [ ] Build successful
- [ ] IPA generated and tested

## 🎯 File Structure After Setup

```
zephyrus-challenge/
├── ios/                          # iOS native project
│   └── App/
│       ├── App.xcodeproj/       # Xcode project
│       └── App/
│           ├── Assets.xcassets/ # App icons
│           └── Info.plist       # iOS app configuration
├── capacitor.config.ts          # Capacitor configuration
├── package.json                 # Dependencies and scripts
└── iOS_BUILD_INSTRUCTIONS.md    # This file
```

## 🚀 Ready to Build!

Once you have all requirements met:

1. `npm install`
2. `npm run ios:prepare`
3. `npm run ios:open`
4. Configure in Xcode
5. Archive and distribute

Your Zephyrus Challenge game will be ready for iPad installation! 🎮 