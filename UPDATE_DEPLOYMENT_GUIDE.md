# 📦 MemoBee Desktop 업데이트 배포 가이드

이 문서는 MemoBee Desktop 앱의 새 버전을 배포하는 방법을 설명합니다.

## 🎯 **업데이트가 작동하는 방식**

1. **자동 감지**: 사용자 앱이 1시간마다 GitHub Releases를 확인
2. **사용자 선택**: 새 버전 발견 시 다운로드 여부를 사용자가 결정
3. **백그라운드 다운로드**: 진행률을 보여주며 백그라운드에서 다운로드
4. **자동 설치**: 사용자가 재시작을 선택하면 자동으로 새 버전 설치

## 🚀 **업데이트 배포 방법 (2가지 옵션)**

### **옵션 1: 자동 스크립트 사용 (추천)**

```bash
# 새 버전 배포 (예: 1.0.1)
./release-script.sh 1.0.1
```

**스크립트가 자동으로 수행하는 작업:**
- ✅ Git 상태 확인
- ✅ package.json 버전 업데이트
- ✅ 변경사항 커밋 및 태그 생성
- ✅ 프로덕션 빌드 및 DMG 생성
- ✅ GitHub에 푸시
- ✅ GitHub Release 생성 안내

### **옵션 2: 수동 배포**

#### **Step 1: 버전 업데이트**
```bash
# package.json에서 버전 수정
npm version 1.0.1 --no-git-tag-version
```

#### **Step 2: 프로덕션 빌드**
```bash
npm run build
npm run dist:mac
```

#### **Step 3: Git 태그 및 푸시**
```bash
git add .
git commit -m "chore: bump version to v1.0.1"
git tag -a "v1.0.1" -m "Release v1.0.1"
git push origin main
git push origin v1.0.1
```

#### **Step 4: GitHub Release 생성**
1. GitHub 저장소 → **Releases** → **Create a new release**
2. **Tag version**: `v1.0.1`
3. **Release title**: `MemoBee v1.0.1`
4. **Assets에 업로드**:
   - `dist/MemoBee-1.0.1.dmg` (Intel Mac)
   - `dist/MemoBee-1.0.1-arm64.dmg` (Apple Silicon)
5. **Publish release** 클릭

## 📋 **배포 전 체크리스트**

### **🔍 사전 준비**
- [ ] GitHub 저장소가 설정되어 있음
- [ ] package.json의 publish 설정이 올바름
- [ ] 로컬에 변경사항이 모두 커밋됨
- [ ] 테스트가 완료됨

### **🏗️ 빌드 확인**
- [ ] `npm run build` 성공
- [ ] `npm run dist:mac` 성공
- [ ] DMG 파일 2개 생성됨 (Intel + ARM64)
- [ ] DMG 파일 크기가 적절함 (100-150MB)

### **🌐 배포 완료**
- [ ] GitHub Release 생성됨
- [ ] DMG 파일들이 Assets에 업로드됨
- [ ] Release가 Published 상태임

## 🔧 **GitHub 저장소 설정**

### **1. 새 저장소 생성**
```bash
# GitHub에서 새 저장소 생성: memobee-desktop
```

### **2. package.json 수정**
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "당신의_GitHub_사용자명",
      "repo": "memobee-desktop"
    }
  }
}
```

### **3. 초기 코드 업로드**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/당신의_사용자명/memobee-desktop.git
git push -u origin main
```

## 🧪 **테스트 배포 (권장)**

첫 번째 실제 배포 전에 테스트 배포를 해보세요:

```bash
# 테스트 버전으로 배포
./release-script.sh 1.0.1-beta

# 또는 직접 테스트
npm version 1.0.1-beta --no-git-tag-version
npm run dist:mac
```

## 🔄 **사용자 업데이트 과정**

### **사용자 관점에서의 업데이트:**

1. **자동 감지** (앱 시작 시 + 1시간마다)
   ```
   🔍 업데이트 확인 중...
   ✨ 새 업데이트 발견: v1.0.1
   ```

2. **사용자 선택**
   ```
   [업데이트 사용 가능]
   MemoBee 1.0.1 업데이트가 있습니다.
   
   현재 버전: 1.0.0
   새 버전: 1.0.1
   
   [나중에] [지금 다운로드] ←
   ```

3. **다운로드 진행률**
   ```
   업데이트 다운로드 중
   ██████████████████ 85.2%
   23.1 MB / 27.1 MB
   ```

4. **설치 확인**
   ```
   [업데이트 준비 완료]
   MemoBee 1.0.1 업데이트가 준비되었습니다.
   
   [나중에 재시작] [지금 재시작] ←
   ```

5. **자동 설치**
   ```
   앱 종료 → 업데이트 설치 → 새 버전으로 재시작
   ```

## 🛠️ **문제 해결**

### **빌드 실패 시**
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 정리
rm -rf dist
npm run build
```

### **업데이트가 감지되지 않을 때**
- GitHub Release가 Published 상태인지 확인
- DMG 파일이 Assets에 올바르게 업로드되었는지 확인
- package.json의 version과 Release tag가 일치하는지 확인

### **사용자가 업데이트를 받지 못할 때**
- 사용자에게 "도움말 → 업데이트 확인" 메뉴 사용 안내
- 또는 앱 재시작 안내

## 📊 **버전 관리 규칙**

### **시맨틱 버전 사용:**
- **Major.Minor.Patch** (예: 1.0.1)
- **Major**: 호환성을 깨는 변경 (1.x.x → 2.0.0)
- **Minor**: 새 기능 추가 (1.0.x → 1.1.0)  
- **Patch**: 버그 수정 (1.0.0 → 1.0.1)

### **Pre-release 버전:**
- **Beta**: 1.0.1-beta
- **Alpha**: 1.0.1-alpha
- **RC**: 1.0.1-rc.1

## 🎉 **배포 완료 후**

배포가 완료되면:

1. **사용자 모니터링**: GitHub Release 다운로드 수 확인
2. **이슈 추적**: 새 버전 관련 이슈나 버그 보고 모니터링  
3. **다음 버전 계획**: 새 기능이나 개선사항 계획

---

## 🔗 **관련 링크**

- **electron-updater 문서**: https://www.electron.build/auto-update
- **GitHub Releases 가이드**: https://docs.github.com/en/repositories/releasing-projects-on-github
- **시맨틱 버전**: https://semver.org/lang/ko/

---

**💡 팁**: 첫 번째 배포 전에 반드시 테스트 배포를 해보세요!