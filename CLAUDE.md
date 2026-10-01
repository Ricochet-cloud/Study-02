# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

개인용 할일 관리 앱 (Todo App)

- **타입**: 순수 HTML/CSS/JavaScript 웹 애플리케이션 (프레임워크/빌드 도구 없음)
- **기능**: 할일 추가/수정/삭제, 완료 체크, 카테고리 필터, 진행률 추적
- **저장**: localStorage를 통한 브라우저 로컬 저장소 자동 동기화
- **디자인**: 다크모드 + 미니멀한 도시배경, 완전한 접근성(키보드 네비게이션, aria-label)

## Architecture

### 상태 관리 (State-driven)

```javascript
state = {
  todos: Array<Todo>,      // [{id, text, category, done, createdAt}, ...]
  filter: String,          // "all" | "work" | "personal" | "study"
  editingId: String | null // 편집 중인 항목 ID
}
```

### 데이터 흐름

```
load() 
  ↓ (localStorage에서 읽기)
render() 
  ↓ (상태를 화면에 표시)
사용자 상호작용 (클릭, 입력 등)
  ↓
상태 변경 함수 (addTodo, updateTodo, deleteTodo, toggleTodo, clearCompleted)
  ↓
save() 
  ↓ (localStorage에 저장)
render()
```

### 핵심 함수

**1. 데이터 로드/저장**
- `load()`: localStorage에서 todos 읽기 (손상된 JSON도 안전하게 처리)
- `save()`: state.todos를 JSON으로 저장 (try/catch로 보호)

**2. 상태 변경 (항상 마지막에 save() 호출)**
- `addTodo(text, category)`: 새 할일 추가 (100자 제한)
- `updateTodo(id, {text, category})`: 항목 수정
- `deleteTodo(id)`: 항목 삭제 (복구용 임시 저장)
- `toggleTodo(id)`: 완료/미완료 토글
- `clearCompleted()`: 완료 항목 일괄 삭제 (confirm 확인)

**3. UI 업데이트**
- `render()`: 필터에 맞는 항목들을 렌더링, 진행률 갱신
- `updateProgress()`: 전체/카테고리별 진행률 계산 및 표시
- `enterEditMode(id) / saveEdit(id) / cancelEdit()`: 인라인 편집 모드

**4. UX 개선**
- `showDeleteToast(id)`: 삭제 안내 토스트 (5초 후 자동 삭제, "되돌리기" 버튼)
- `loadDefaultCategory() / saveDefaultCategory()`: 마지막 카테고리 선택값 기억

## File Structure

```
Study-02/
├── index.html          # 레이아웃 + SVG 도시배경
├── style.css           # 다크모드 스타일 + 반응형
├── app.js              # 상태 관리 + 이벤트 연결
└── CLAUDE.md           # 이 파일
```

## Key Features

### ✅ 기본 기능
- 할일 추가 (텍스트 입력 + 카테고리 선택)
- 항목 체크 (완료/미완료 토글)
- 항목 수정 (더블클릭 또는 수정 버튼 → 인라인 편집)
- 항목 삭제 (5초 복구 안내)
- 완료 항목 일괄 삭제 (확인 창)

### 🎯 필터링 & 진행률
- 카테고리 탭: 전체 / 업무 / 개인 / 공부
- 전체 진행률: "7 / 12 · 58%" 형식 + 진행 바
- 카테고리별 진행률: 각 카테고리의 완료/전체 표시

### 💾 데이터 유지
- localStorage에 자동 저장 (키: `todo-app-v1`)
- 브라우저 재시작해도 데이터 유지
- 손상된 JSON도 에러 없이 빈 배열로 시작

### ♿ 접근성
- 키보드만으로 모든 기능 조작 가능
  - Tab: 포커스 이동
  - Enter: 항목 추가, 편집 저장, 텍스트 수정 모드 진입
  - Esc: 편집 취소
- aria-label: 모든 버튼 및 입력 필드에 지정
- 포커스 표시: 2px 파란 아웃라인

### 🎨 다크모드 + 시인성
- 배경: 다크 그라데이션 + 미니멀한 도시 실루엣 (SVG)
- 텍스트: 밝은 회색/흰색으로 높은 명도 대비
- 카드: 반투명 배경 + backdrop-filter (유리 효과)
- 버튼: 그라데이션 + 글로우 효과
- 반응형: 모바일, 태블릿, 데스크톱 모두 최적화

## Design Details

### 색상 팔레트
- **배경**: `#0f1419` → `#1a1f3a` (그라데이션)
- **카드 배경**: `rgba(25, 35, 70, 0.6)` (반투명)
- **텍스트 주**: `#e0e0e0` (밝은 회색)
- **텍스트 보조**: `#a0a0a0` (중간 회색)
- **카테고리**:
  - 업무: 파란색 그라데이션 (`#5ba3ff` → `#3b82f6`)
  - 개인: 분홍색 그라데이션 (`#ff6ec7` → `#ec4899`)
  - 공부: 초록색 그라데이션 (`#34d399` → `#10b981`)

### 레이아웃
- 최대 너비: 600px (모바일 최적화)
- 핵심 요소:
  1. 헤더 (제목 + 오늘 날짜)
  2. 진행률 영역 (진행 바 + 숫자 + 카테고리별 통계)
  3. 필터 탭 (전체 / 업무 / 개인 / 공부)
  4. 입력 영역 (텍스트 입력 + 카테고리 선택 + 추가 버튼)
  5. 할일 목록 (스크롤 가능, 최대 항목 수 제약 없음)
  6. 하단 버튼 (완료 항목 삭제)

## Development Notes

### localStorage 에러 처리
- `load()`와 `save()` 모두 try/catch로 보호
- localStorage 실패해도 앱은 계속 동작 (인메모리 상태 사용)
- 시크릿 모드 등에서도 안전

### 항목 수정 흐름
1. 텍스트 더블클릭 또는 "수정" 버튼 → `enterEditMode(id)`
2. state.editingId 설정 후 render() → 편집 모드 UI 표시
3. Enter로 저장 또는 Esc로 취소
4. `saveEdit(id)` → `updateTodo()` → `save()` → `render()`

### 삭제 안전장치
1. 삭제 버튼 클릭 → `deleteTodo()` + `showDeleteToast(id)`
2. deletedTodoCache에 삭제된 항목 임시 저장
3. 토스트 표시 (5초간)
4. "되돌리기" 클릭 시 state.todos에 복구
5. 5초 후 또는 다른 삭제 시 영구 삭제

### 진행률 계산
- `updateProgress()` 함수에서 계산
- 항상 전체 todos 기준 (필터와 무관)
- 0개 항목: "할 일을 추가해 보세요" 표시
- 항목 있음: "완료 / 전체 · 퍼센트"

## How to Use

### 브라우저에서 실행
```
index.html을 브라우저에서 열기
```

### 키보드 단축키
- **Tab**: 포커스 이동
- **Enter**: 할일 추가, 편집 저장, 텍스트 수정 모드
- **Esc**: 편집 취소
- **더블클릭**: 텍스트 수정 모드

### 데이터 초기화
```javascript
// 콘솔에서:
localStorage.removeItem('todo-app-v1')
location.reload()
```

## Browser Compatibility

- Chrome/Edge: ✅ 완벽 지원
- Firefox: ✅ 완벽 지원
- Safari: ✅ 완벽 지원
- IE 11: ❌ 미지원 (화살표 함수, const/let 등)

## Future Improvements (Optional)

- 항목 드래그 앤 드롭으로 순서 변경
- 우선순위 (높음/중간/낮음) 추가
- 마감일 기능
- 반복 할일
- 로컬 동기화 대신 클라우드 백업
- 다크모드 토글 (라이트모드 추가)
