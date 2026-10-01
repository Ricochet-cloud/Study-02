/*
 * TODO APP - 데이터 및 상태 관리
 *
 * [상태 구조]
 * - state.todos: 할일 배열 [{id, text, category, done, createdAt}, ...]
 * - state.filter: 현재 필터 ("all" | "work" | "personal" | "study")
 * - state.editingId: 편집 중인 항목 ID (null 또는 문자열)
 * - deletedTodoCache: 삭제된 항목 임시 저장 (복구용)
 *
 * [생명주기]
 * load() → render() → 사용자 상호작용 → 상태변경 → save() → render() → ...
 */

const STORAGE_KEY = 'todo-app-v1';
const DEFAULT_CATEGORY_KEY = 'todo-app-default-category';

const state = {
    todos: [],
    filter: 'all',
    editingId: null
};

let deletedTodoCache = null;
let deleteTimeoutId = null;

// ============================================================================
// 1. 데이터 로드/저장
// ============================================================================

function load() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                state.todos = parsed;
            } else {
                state.todos = [];
            }
        } else {
            state.todos = [];
        }
    } catch (error) {
        console.error('Failed to load todos from localStorage:', error);
        state.todos = [];
    }
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
    } catch (error) {
        console.error('Failed to save todos to localStorage:', error);
        // localStorage 실패해도 앱은 계속 동작
    }
}

// ============================================================================
// 2. 상태 변경 함수
// ============================================================================

function addTodo(text, category) {
    const trimmed = String(text).trim();

    if (!trimmed) {
        console.warn('Todo text cannot be empty');
        return null;
    }

    const truncated = trimmed.substring(0, 100);
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    const todo = {
        id,
        text: truncated,
        category,
        done: false,
        createdAt
    };

    state.todos.push(todo);
    save();

    return todo;
}

function updateTodo(id, updates) {
    const todo = state.todos.find(t => t.id === id);

    if (!todo) {
        console.warn(`Todo with id ${id} not found`);
        return null;
    }

    if (updates.text !== undefined) {
        const trimmed = String(updates.text).trim();
        if (trimmed) {
            todo.text = trimmed.substring(0, 100);
        } else {
            console.warn('Cannot update todo with empty text');
            return todo;
        }
    }

    if (updates.category !== undefined) {
        if (['work', 'personal', 'study'].includes(updates.category)) {
            todo.category = updates.category;
        }
    }

    save();
    return todo;
}

function deleteTodo(id) {
    const index = state.todos.findIndex(t => t.id === id);

    if (index === -1) {
        console.warn(`Todo with id ${id} not found`);
        return false;
    }

    // 삭제된 항목 임시 저장 (복구용)
    deletedTodoCache = { index, todo: state.todos[index] };

    state.todos.splice(index, 1);
    save();
    return true;
}

function toggleTodo(id) {
    const todo = state.todos.find(t => t.id === id);

    if (!todo) {
        console.warn(`Todo with id ${id} not found`);
        return null;
    }

    todo.done = !todo.done;
    save();
    return todo;
}

function clearCompleted() {
    // 확인 창
    if (!confirm('완료된 항목 ' + state.todos.filter(t => t.done).length + '개를 삭제하시겠습니까?')) {
        return 0;
    }

    const beforeCount = state.todos.length;
    state.todos = state.todos.filter(t => !t.done);
    const deletedCount = beforeCount - state.todos.length;

    save();
    return deletedCount;
}

// ============================================================================
// 3. UI 업데이트
// ============================================================================

function getCategoryLabel(category) {
    const labels = {
        'work': '업무',
        'personal': '개인',
        'study': '공부'
    };
    return labels[category] || category;
}

function updateProgress() {
    const total = state.todos.length;
    const completed = state.todos.filter(t => t.done).length;

    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const workCount = document.getElementById('workCount');
    const personalCount = document.getElementById('personalCount');
    const studyCount = document.getElementById('studyCount');

    if (total === 0) {
        progressBar.style.width = '0%';
        progressText.textContent = '할 일을 추가해 보세요';
        workCount.textContent = '0 / 0';
        personalCount.textContent = '0 / 0';
        studyCount.textContent = '0 / 0';
        return;
    }

    const percentage = Math.round((completed / total) * 100);
    progressBar.style.width = percentage + '%';
    progressText.textContent = `${completed} / ${total} · ${percentage}%`;

    // 카테고리별 진행률
    const categories = ['work', 'personal', 'study'];
    const countMap = {
        'work': workCount,
        'personal': personalCount,
        'study': studyCount
    };

    categories.forEach(category => {
        const categoryTodos = state.todos.filter(t => t.category === category);
        const categoryCompleted = categoryTodos.filter(t => t.done).length;
        countMap[category].textContent = `${categoryCompleted} / ${categoryTodos.length}`;
    });
}

function showDeleteToast(todoId) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // 기존 타이머 취소
    if (deleteTimeoutId) {
        clearTimeout(deleteTimeoutId);
    }

    // 토스트 내용 설정
    toastMessage.textContent = '삭제되었습니다 · ';

    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = '되돌리기';
    undoBtn.setAttribute('aria-label', '삭제된 항목 복구');
    undoBtn.addEventListener('click', () => {
        if (deletedTodoCache && deletedTodoCache.todo.id === todoId) {
            const { index, todo } = deletedTodoCache;
            state.todos.splice(index, 0, todo);
            save();
            render();
            hideToast();
        }
    });

    toastMessage.innerHTML = '삭제되었습니다 · ';
    toastMessage.appendChild(undoBtn);

    toast.classList.add('show');

    // 5초 후 자동 삭제 및 토스트 숨김
    deleteTimeoutId = setTimeout(() => {
        deletedTodoCache = null;
        hideToast();
    }, 5000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
    if (deleteTimeoutId) {
        clearTimeout(deleteTimeoutId);
        deleteTimeoutId = null;
    }
}

function enterEditMode(id) {
    state.editingId = id;
    render();

    setTimeout(() => {
        const input = document.getElementById('edit-text-' + id);
        if (input) {
            input.focus();
            input.select();
        }
    }, 0);
}

function saveEdit(id) {
    const textInput = document.getElementById('edit-text-' + id);
    const categorySelect = document.getElementById('edit-category-' + id);

    if (!textInput || !categorySelect) return;

    const newText = textInput.value.trim();
    if (!newText) {
        alert('할일 내용을 입력해주세요');
        return;
    }

    updateTodo(id, {
        text: newText,
        category: categorySelect.value
    });

    state.editingId = null;
    render();
}

function cancelEdit() {
    state.editingId = null;
    render();
}

// ============================================================================
// 4. 렌더링
// ============================================================================

function render() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';

    // 필터에 맞는 항목들
    const filtered = state.todos.filter(todo => {
        if (state.filter === 'all') return true;
        return todo.category === state.filter;
    });

    // 빈 상태 처리
    if (filtered.length === 0 && state.todos.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-message';
        emptyDiv.textContent = '할 일을 추가해 보세요';
        todoList.appendChild(emptyDiv);
        updateProgress();
        return;
    }

    // 각 항목 렌더링
    filtered.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';

        if (state.editingId === todo.id) {
            // 편집 모드
            li.classList.add('editing');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = todo.done;
            checkbox.disabled = true;

            const editWrapper = document.createElement('div');
            editWrapper.className = 'edit-input-wrapper';

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.id = 'edit-text-' + todo.id;
            textInput.className = 'edit-text-input';
            textInput.value = todo.text;
            textInput.maxLength = 100;
            textInput.setAttribute('aria-label', '할일 텍스트 수정');
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(todo.id);
                }
            });
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cancelEdit();
                }
            });

            const controlsRow = document.createElement('div');
            controlsRow.className = 'edit-controls-row';

            const categorySelect = document.createElement('select');
            categorySelect.id = 'edit-category-' + todo.id;
            categorySelect.className = 'edit-category-select';
            categorySelect.setAttribute('aria-label', '카테고리 선택');
            ['work', 'personal', 'study'].forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = getCategoryLabel(cat);
                if (cat === todo.category) {
                    option.selected = true;
                }
                categorySelect.appendChild(option);
            });

            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-save-btn';
            saveBtn.textContent = '저장';
            saveBtn.setAttribute('aria-label', '수정 내용 저장');
            saveBtn.addEventListener('click', () => saveEdit(todo.id));

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'edit-cancel-btn';
            cancelBtn.textContent = '취소';
            cancelBtn.setAttribute('aria-label', '수정 취소');
            cancelBtn.addEventListener('click', cancelEdit);

            controlsRow.appendChild(categorySelect);
            controlsRow.appendChild(saveBtn);
            controlsRow.appendChild(cancelBtn);

            editWrapper.appendChild(textInput);
            editWrapper.appendChild(controlsRow);

            li.appendChild(checkbox);
            li.appendChild(editWrapper);
        } else {
            // 일반 모드
            if (todo.done) {
                li.classList.add('completed');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = todo.done;
            checkbox.setAttribute('aria-label', todo.text + ' (체크)');
            checkbox.addEventListener('change', () => {
                toggleTodo(todo.id);
                render();
            });

            const text = document.createElement('span');
            text.className = 'todo-text';
            text.textContent = todo.text;
            text.style.cursor = 'pointer';
            text.setAttribute('role', 'button');
            text.setAttribute('tabindex', '0');
            text.setAttribute('aria-label', todo.text + ' (더블클릭하여 수정)');
            text.addEventListener('dblclick', () => {
                enterEditMode(todo.id);
            });
            text.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    enterEditMode(todo.id);
                }
            });

            const category = document.createElement('span');
            category.className = `todo-category ${todo.category}`;
            category.textContent = getCategoryLabel(todo.category);

            const editBtn = document.createElement('button');
            editBtn.className = 'todo-edit-btn';
            editBtn.textContent = '수정';
            editBtn.setAttribute('aria-label', todo.text + ' 수정');
            editBtn.addEventListener('click', () => {
                enterEditMode(todo.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'todo-delete-btn';
            deleteBtn.textContent = '삭제';
            deleteBtn.setAttribute('aria-label', todo.text + ' 삭제');
            deleteBtn.addEventListener('click', () => {
                deleteTodo(todo.id);
                showDeleteToast(todo.id);
                render();
            });

            li.appendChild(checkbox);
            li.appendChild(text);
            li.appendChild(category);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
        }

        todoList.appendChild(li);
    });

    // 필터된 목록이 비어있지만 전체 목록은 있는 경우
    if (filtered.length === 0 && state.todos.length > 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-message';
        emptyDiv.textContent = '해당 카테고리에 할 일이 없습니다';
        todoList.appendChild(emptyDiv);
    }

    updateProgress();
}

// ============================================================================
// 5. 이벤트 연결 및 초기화
// ============================================================================

function loadDefaultCategory() {
    const categorySelect = document.getElementById('categorySelect');
    const saved = localStorage.getItem(DEFAULT_CATEGORY_KEY);
    if (saved && ['work', 'personal', 'study'].includes(saved)) {
        categorySelect.value = saved;
    }
}

function saveDefaultCategory() {
    const categorySelect = document.getElementById('categorySelect');
    localStorage.setItem(DEFAULT_CATEGORY_KEY, categorySelect.value);
}

function addTodoFromInput() {
    const todoInput = document.getElementById('todoInput');
    const categorySelect = document.getElementById('categorySelect');
    const text = todoInput.value;
    const category = categorySelect.value;

    if (addTodo(text, category)) {
        todoInput.value = '';
        todoInput.focus();
        render();
    }
}

// 앱 시작: 데이터 로드
load();

// DOM 준비 완료 후 이벤트 연결
document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todoInput');
    const categorySelect = document.getElementById('categorySelect');
    const addBtn = document.querySelector('.add-btn');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const clearCompletedBtn = document.querySelector('.clear-completed-btn');

    // 기본 카테고리 로드
    loadDefaultCategory();

    // 카테고리 선택값 변경 시 저장
    categorySelect.addEventListener('change', saveDefaultCategory);

    // 입력 필드 Enter 키
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodoFromInput();
        }
    });

    // 추가 버튼 클릭
    addBtn.addEventListener('click', addTodoFromInput);
    addBtn.setAttribute('aria-label', '할일 추가');

    // 필터 탭 클릭
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.filter = tab.dataset.filter;
            render();
        });
    });

    // "완료 항목 삭제" 버튼
    clearCompletedBtn.addEventListener('click', () => {
        const deleted = clearCompleted();
        if (deleted > 0) {
            render();
        }
    });

    // 초기 렌더링
    render();

    // 오늘 날짜 표시
    const dateElement = document.getElementById('todayDate');
    const today = new Date();
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    const formattedDate = today.toLocaleDateString('ko-KR', options);
    dateElement.textContent = formattedDate;
});
