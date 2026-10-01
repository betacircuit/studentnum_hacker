# studentnum_hacker 

이름을 입력하면 학번을, 학번을 입력하면 이름을 보여주는 웹 앱입니다.

## 실행

```sh
python3 -m http.server 8000   # 후 http://localhost:8000 접속
```

`index.html`을 브라우저로 직접 열어도 동작합니다 (서버 불필요, 외부 라이브러리 없음).

## 사용법

- **이름 검색**: `강가상` → 학번 · 학부 · 좌석. 동명이인(`정예시`)은 모두 표시됩니다.
- **학번 검색**: `2099-19738`, `209919738`, 또는 `738` 같은 일부 숫자. 숫자·하이픈만 입력하면 학번 검색으로 판단합니다.
- 결과 카드의 `학번 복사` 버튼으로 클립보드에 복사합니다.

## 명령어

```sh
python3 scripts/make_sample_data.py   # 가상 CSV 재생성 (seed 고정)
python3 scripts/build_data.py         # data.js 재생성
node --test                           # 조회 로직 테스트
```

## 구조

| 파일 | 역할 |
| --- | --- |
| `lookup.js` | 검색·하이라이트 로직 (DOM 비의존, node 테스트 가능) |
| `app.js` | 화면 렌더링, 입력 처리, 복사 버튼 |
| `index.html` | 마크업과 스타일 (라이트/다크, 모바일 대응) |
| `scripts/` | 샘플 데이터 생성·빌드 |
| `tests/` | `node:test` 기반 단위 테스트 |
