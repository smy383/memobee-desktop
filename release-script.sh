#!/bin/bash

# MemoBee Desktop 자동 릴리즈 스크립트
# 사용법: ./release-script.sh 1.0.1

set -e  # 오류 발생 시 스크립트 중단

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수: 로그 출력
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# 인수 확인
if [ $# -eq 0 ]; then
    error "사용법: $0 <새_버전_번호> (예: $0 1.0.1)"
fi

NEW_VERSION=$1
CURRENT_VERSION=$(node -p "require('./package.json').version")

log "🚀 MemoBee Desktop 릴리즈 시작"
log "현재 버전: $CURRENT_VERSION"
log "새 버전: $NEW_VERSION"

# 확인
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "릴리즈가 취소되었습니다."
    exit 0
fi

# 1. Git 상태 확인
log "📋 Git 상태 확인 중..."
if [[ -n $(git status --porcelain) ]]; then
    warning "커밋되지 않은 변경사항이 있습니다:"
    git status --short
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# 2. package.json 버전 업데이트
log "📝 package.json 버전 업데이트 중..."
npm version $NEW_VERSION --no-git-tag-version
log "✅ 버전이 $NEW_VERSION으로 업데이트되었습니다."

# 3. 변경사항 커밋
log "💾 변경사항 커밋 중..."
git add package.json package-lock.json
git commit -m "chore: bump version to v$NEW_VERSION

🚀 Release v$NEW_VERSION

📦 Generated with MemoBee Desktop Release Script
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Git 태그 생성
log "🏷️  Git 태그 생성 중..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# 5. 프로덕션 빌드
log "🔨 프로덕션 빌드 시작..."
npm run build

# 6. 배포용 DMG 생성
log "📦 macOS DMG 빌드 시작..."
npm run dist:mac

# 7. 빌드 결과 확인
DMG_X64="dist/MemoBee-$NEW_VERSION.dmg"
DMG_ARM64="dist/MemoBee-$NEW_VERSION-arm64.dmg"

if [[ -f "$DMG_X64" && -f "$DMG_ARM64" ]]; then
    log "✅ DMG 파일 생성 완료:"
    ls -lh dist/*.dmg
else
    error "❌ DMG 파일 생성 실패"
fi

# 8. GitHub에 푸시
log "⬆️  GitHub에 변경사항 푸시 중..."
git push origin main
git push origin "v$NEW_VERSION"

# 9. GitHub Release 생성 안내
log "🎉 빌드 완료!"
echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 다음 단계: GitHub Release 생성${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "1. GitHub 저장소 페이지로 이동:"
echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]//' | sed 's/.git$//')"
echo
echo "2. 'Releases' → 'Create a new release' 클릭"
echo
echo "3. 릴리즈 정보 입력:"
echo "   - Tag version: v$NEW_VERSION"
echo "   - Release title: MemoBee v$NEW_VERSION"
echo "   - Description: 변경사항 설명"
echo
echo "4. 다음 파일들을 Assets에 업로드:"
echo "   - $DMG_X64"
echo "   - $DMG_ARM64"
echo
echo "5. 'Publish release' 클릭"
echo
echo -e "${GREEN}🎯 릴리즈 완료 후 모든 사용자가 자동으로 업데이트를 받을 수 있습니다!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"