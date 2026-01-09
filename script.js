// 當前登入的用戶
let currentUser = null;

// 獲取當前用戶的資料鍵
function getUserDataKey(key) {
    if (!currentUser) return null;
    return `${key}_${currentUser}`;
}

// 從 localStorage 載入 todos，如果沒有則返回空陣列
function loadTodos() {
    if (!currentUser) return [];
    const dataKey = getUserDataKey('todos');
    const savedTodos = localStorage.getItem(dataKey);
    if (savedTodos) {
        return JSON.parse(savedTodos);
    }
    // 沒有資料時返回空陣列
    return [];
}

// 儲存 todos 到 localStorage
function saveTodos(todos) {
    if (!currentUser) return;
    const dataKey = getUserDataKey('todos');
    localStorage.setItem(dataKey, JSON.stringify(todos));
}

// 用戶管理功能
function registerUser(username, email, password) {
    // 檢查用戶名是否已存在
    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return { success: false, message: '用戶名已存在' };
    }
    
    // 檢查電子郵件是否已存在
    if (users.find(u => u.email === email)) {
        return { success: false, message: '此電子郵件已被註冊' };
    }
    
    // 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, message: '請輸入有效的電子郵件地址' };
    }
    
    // 創建新用戶（密碼使用簡單的 hash，實際應用中應該使用更安全的方式）
    const newUser = {
        username: username,
        email: email,
        password: simpleHash(password),
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return { success: true, message: '註冊成功' };
}

// 忘記密碼功能
function forgotPassword(email) {
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
        return { success: false, message: '找不到此電子郵件對應的帳號' };
    }
    
    // 在實際應用中，這裡應該發送電子郵件
    // 由於是純前端應用，我們只顯示提示訊息
    return { 
        success: true, 
        message: `密碼重設通知已發送到 ${email}。請檢查您的電子郵件信箱。\n\n注意：這是純前端應用，實際環境中需要後端服務來發送電子郵件。` 
    };
}

function loginUser(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return { success: false, message: '用戶名不存在' };
    }
    
    if (user.password !== simpleHash(password)) {
        return { success: false, message: '密碼錯誤' };
    }
    
    currentUser = username;
    localStorage.setItem('currentUser', username);
    
    return { success: true, message: '登入成功' };
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
}

function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

// 簡單的密碼 hash 函數（僅用於演示，實際應用應使用更安全的方式）
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// 載入心情提醒
function loadMoodReminder() {
    if (!currentUser) return;
    const moodReminder = document.getElementById('moodReminder');
    if (moodReminder) {
        const dataKey = getUserDataKey('moodReminder');
        const saved = localStorage.getItem(dataKey);
        if (saved) {
            moodReminder.value = saved;
        }
    }
}

// 保存心情提醒
function saveMoodReminder() {
    if (!currentUser) return;
    const moodReminder = document.getElementById('moodReminder');
    if (moodReminder) {
        const dataKey = getUserDataKey('moodReminder');
        localStorage.setItem(dataKey, moodReminder.value);
    }
}

// 取得下一個可用的 ID
function getNextId(todos) {
    if (todos.length === 0) return 1;
    return Math.max(...todos.map(todo => todo.id)) + 1;
}

// 重新編號所有待辦事項
function renumberTodos(todos) {
    return todos.map((todo, index) => {
        // 如果文字是「待辦事項 X」或「待辦事項X」格式，則重新編號
        if (todo.text && todo.text.match(/^待辦事項\s?\d+$/)) {
            todo.text = `待辦事項 ${index + 1}`;
        }
        return todo;
    });
}

// 選中的日期過濾
let selectedDate = null;
let editingTodoId = null;

// 將時間轉換為分鐘數（從00:00開始）
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// 計算待辦事項的左側位置，考慮並列框的位置（使用預先計算的寬度）
function calculateLeftPositionWithWidths(todo, hour, sortedHourTodos, timeContent, todoWidths) {
    const startMinutes = timeToMinutes(todo.workStartTime);
    const endMinutes = timeToMinutes(todo.workEndTime);
    const blockStartMinutes = Math.max(startMinutes, hour * 60);
    const blockEndMinutes = Math.min(endMinutes, (hour + 1) * 60);
    
    // 找出同一行（時間重疊）的其他待辦事項，使用已經排序的列表
    const overlappingTodos = sortedHourTodos.filter(otherTodo => {
        if (otherTodo.id === todo.id) return false;
        const otherStart = timeToMinutes(otherTodo.workStartTime);
        const otherEnd = timeToMinutes(otherTodo.workEndTime);
        const otherBlockStart = Math.max(otherStart, hour * 60);
        const otherBlockEnd = Math.min(otherEnd, (hour + 1) * 60);
        // 時間重疊
        return !(otherBlockEnd <= blockStartMinutes || otherBlockStart >= blockEndMinutes);
    });
    
    // 由於 sortedHourTodos 已經按起始時間排序，overlappingTodos 也已經按起始時間排序
    // 找出當前待辦事項在重疊組中的位置
    const allOverlapping = [...overlappingTodos, todo].sort((a, b) => {
        const aStart = timeToMinutes(a.workStartTime);
        const bStart = timeToMinutes(b.workStartTime);
        if (aStart !== bStart) return aStart - bStart;
        // 如果起始時間相同，按ID排序以保持穩定性
        return a.id - b.id;
    });
    const currentIndex = allOverlapping.findIndex(t => t.id === todo.id);
    
    // 計算左側位置：累加前面所有待辦事項的寬度
    let leftPx = 0;
    for (let i = 0; i < currentIndex; i++) {
        const prevTodo = allOverlapping[i];
        const prevWidth = todoWidths.get(prevTodo.id) || 120;
        leftPx += prevWidth + 4; // 4px 是 margin-right
    }
    
    return leftPx;
}

// 更新並列框的位置（當一個框的寬度改變時）
function updateAdjacentBlocksPosition(changedBlock, hour, timeContent) {
    const blockId = changedBlock.dataset.id;
    const startTime = changedBlock.dataset.startTime;
    const endTime = changedBlock.dataset.endTime;
    
    if (!startTime || !endTime) return;
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const blockStartMinutes = Math.max(startMinutes, hour * 60);
    const blockEndMinutes = Math.min(endMinutes, (hour + 1) * 60);
    
    // 找出同一行的其他待辦事項，按起始時間排序
    const allBlocks = Array.from(timeContent.querySelectorAll('.todo-block')).filter(block => {
        if (block.dataset.id === blockId) return false;
        const otherStartTime = block.dataset.startTime;
        const otherEndTime = block.dataset.endTime;
        if (!otherStartTime || !otherEndTime) return false;
        
        const otherStart = timeToMinutes(otherStartTime);
        const otherEnd = timeToMinutes(otherEndTime);
        const otherBlockStart = Math.max(otherStart, hour * 60);
        const otherBlockEnd = Math.min(otherEnd, (hour + 1) * 60);
        
        // 時間重疊
        return !(otherBlockEnd <= blockStartMinutes || otherBlockStart >= blockEndMinutes);
    });
    
    // 按起始時間排序
    allBlocks.sort((a, b) => {
        const aStart = timeToMinutes(a.dataset.startTime);
        const bStart = timeToMinutes(b.dataset.startTime);
        return aStart - bStart;
    });
    
    // 找出當前框在排序後的位置
    const allBlocksWithCurrent = [changedBlock, ...allBlocks].sort((a, b) => {
        const aStart = timeToMinutes(a.dataset.startTime);
        const bStart = timeToMinutes(b.dataset.startTime);
        return aStart - bStart;
    });
    
    const currentIndex = allBlocksWithCurrent.findIndex(b => b.dataset.id === blockId);
    
    // 重新計算所有右邊框的位置（按起始時間順序）
    let currentLeft = changedBlock.offsetLeft + changedBlock.offsetWidth + 4;
    for (let i = currentIndex + 1; i < allBlocksWithCurrent.length; i++) {
        const block = allBlocksWithCurrent[i];
        block.style.left = `${currentLeft}px`;
        currentLeft += block.offsetWidth + 4;
    }
}

// 渲染 24 小時時間軸
function renderTodos() {
    const timeSchedule = document.getElementById('timeSchedule');
    let allTodos = loadTodos();
    
    // 保存完整列表並重新編號
    allTodos = renumberTodos(allTodos);
    saveTodos(allTodos);
    
    // 根據選中的日期過濾
    let displayTodos = selectedDate ? 
        allTodos.filter(todo => todo.dueDate === selectedDate) : 
        allTodos;
    
    // 過濾出有時間的待辦事項
    displayTodos = displayTodos.filter(todo => todo.workStartTime && todo.workEndTime);
    
    // 按開始時間排序（先按小時，再按分鐘）
    displayTodos.sort((a, b) => {
        return timeToMinutes(a.workStartTime) - timeToMinutes(b.workStartTime);
    });
    
    // 更新標題
    if (selectedDate) {
        const dateParts = selectedDate.split('-');
        document.getElementById('todoTitle').textContent = `${parseInt(dateParts[0])}年${parseInt(dateParts[1])}月${parseInt(dateParts[2])}日 待辦事項`;
    } else {
        document.getElementById('todoTitle').textContent = '今天待辦事項';
    }
    
    timeSchedule.innerHTML = '';
    
    // 為跨小時的待辦事項保存布局信息（在開始小時計算，後續小時使用）
    const spanningTodoLayout = new Map(); // todo.id -> { columnIndex, widthPercent, leftPercent }
    
    // 生成24小時時間軸
    for (let hour = 0; hour < 24; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.dataset.hour = hour;
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${String(hour).padStart(2, '0')}:00`;
        timeSlot.appendChild(timeLabel);
        
        const timeContent = document.createElement('div');
        timeContent.className = 'time-content';
        timeContent.dataset.hour = hour;
        
        // 找出在這個小時範圍內的待辦事項
        const hourStartMinutes = hour * 60;
        const hourEndMinutes = (hour + 1) * 60;
        
        const hourTodos = displayTodos.filter(todo => {
            const startMinutes = timeToMinutes(todo.workStartTime);
            const endMinutes = timeToMinutes(todo.workEndTime);
            // 如果開始時間或結束時間在這個小時內，或者跨小時包含這個小時
            return (startMinutes < hourEndMinutes && endMinutes > hourStartMinutes);
        });
        
        if (hourTodos.length > 0) {
            // 分離不同類型的待辦事項
            // 1. 從前一小時延伸過來的跨小時待辦事項（已經有布局）
            const extendingFromPrevious = hourTodos.filter(todo => {
                if (!spanningTodoLayout.has(todo.id)) return false;
                const startMinutes = timeToMinutes(todo.workStartTime);
                const startHour = Math.floor(startMinutes / 60);
                return startHour < hour; // 在前一小時開始的
            });
            
            // 2. 在這個小時開始的跨小時待辦事項（需要計算布局）
            const spanningStartingHere = hourTodos.filter(todo => {
                if (spanningTodoLayout.has(todo.id)) return false;
                const startMinutes = timeToMinutes(todo.workStartTime);
                const endMinutes = timeToMinutes(todo.workEndTime);
                const startHour = Math.floor(startMinutes / 60);
                const endHour = Math.floor(endMinutes / 60);
                return startHour !== endHour && startHour === hour;
            });
            
            // 3. 不跨小時的待辦事項（需要計算布局）
            const nonSpanningInHour = hourTodos.filter(todo => {
                const startMinutes = timeToMinutes(todo.workStartTime);
                const endMinutes = timeToMinutes(todo.workEndTime);
                const startHour = Math.floor(startMinutes / 60);
                const endHour = Math.floor(endMinutes / 60);
                return startHour === endHour && startHour === hour;
            });
            
            // 為這個小時內需要計算布局的待辦事項計算布局
            const hourLayout = new Map(); // 僅用於這個小時的布局
            
            // 合併需要計算布局的待辦事項（不跨小時的 + 跨小時的開始小時）
            const todosToLayout = [...nonSpanningInHour, ...spanningStartingHere];
            
            if (todosToLayout.length > 0) {
                // 按分鐘排序
                todosToLayout.sort((a, b) => {
                    return timeToMinutes(a.workStartTime) - timeToMinutes(b.workStartTime);
                });
                
                // 找出所有重疊組（基於這個小時內的時間範圍）
                const overlapGroups = [];
                todosToLayout.forEach((todo, index) => {
                    const startMinutes = timeToMinutes(todo.workStartTime);
                    const endMinutes = timeToMinutes(todo.workEndTime);
                    const blockStartMinutes = Math.max(startMinutes, hourStartMinutes);
                    const blockEndMinutes = Math.min(endMinutes, hourEndMinutes);
                    
                    let foundGroup = false;
                    for (let group of overlapGroups) {
                        // 檢查是否與組內任何待辦事項重疊
                        const overlaps = group.some(groupTodo => {
                            const groupStart = timeToMinutes(groupTodo.workStartTime);
                            const groupEnd = timeToMinutes(groupTodo.workEndTime);
                            const groupBlockStart = Math.max(groupStart, hourStartMinutes);
                            const groupBlockEnd = Math.min(groupEnd, hourEndMinutes);
                            return !(groupBlockEnd <= blockStartMinutes || groupBlockStart >= blockEndMinutes);
                        });
                        
                        if (overlaps) {
                            group.push(todo);
                            foundGroup = true;
                            break;
                        }
                    }
                    if (!foundGroup) {
                        overlapGroups.push([todo]);
                    }
                });
                
                // 為每個重疊組內的待辦事項按時間排序（由左而右）
                overlapGroups.forEach(group => {
                    group.sort((a, b) => {
                        return timeToMinutes(a.workStartTime) - timeToMinutes(b.workStartTime);
                    });
                });
                
                // 為每個重疊組分配布局，考慮延伸過來的待辦事項
                overlapGroups.forEach(group => {
                    // 檢查這個組是否與延伸過來的待辦事項重疊（時間上）
                    const overlappingExtending = [];
                    group.forEach(todo => {
                        const startMinutes = timeToMinutes(todo.workStartTime);
                        const endMinutes = timeToMinutes(todo.workEndTime);
                        const blockStartMinutes = Math.max(startMinutes, hourStartMinutes);
                        const blockEndMinutes = Math.min(endMinutes, hourEndMinutes);
                        
                        extendingFromPrevious.forEach(extTodo => {
                            const extStart = timeToMinutes(extTodo.workStartTime);
                            const extEnd = timeToMinutes(extTodo.workEndTime);
                            const extBlockStart = Math.max(extStart, hourStartMinutes);
                            const extBlockEnd = Math.min(extEnd, hourEndMinutes);
                            
                            // 時間上重疊
                            if (!(extBlockEnd <= blockStartMinutes || extBlockStart >= blockEndMinutes)) {
                                const extLayout = spanningTodoLayout.get(extTodo.id);
                                if (extLayout) {
                                    // 記錄延伸過來的布局信息
                                    if (!overlappingExtending.find(e => e.columnIndex === extLayout.columnIndex)) {
                                        overlappingExtending.push(extLayout);
                                    }
                                }
                            }
                        });
                    });
                    
                    // 如果與延伸過來的重疊，新小時的待辦事項要共享剩餘空間
                    if (overlappingExtending.length > 0) {
                        // 計算延伸過來的待辦事項佔用的總寬度
                        overlappingExtending.sort((a, b) => a.leftPercent - b.leftPercent);
                        const totalExtWidth = overlappingExtending.reduce((sum, layout) => sum + layout.widthPercent, 0);
                        
                        // 剩餘空間分配給新小時的待辦事項
                        const availableWidth = 100 - totalExtWidth;
                        const newWidth = availableWidth / group.length;
                        
                        // 找出延伸過來的待辦事項的右邊界（最右邊的位置 + 寬度）
                        const extRight = Math.max(...overlappingExtending.map(l => l.leftPercent + l.widthPercent));
                        
                        group.forEach((todo, index) => {
                            const layout = {
                                columnIndex: overlappingExtending.length + index,
                                widthPercent: newWidth,
                                leftPercent: extRight + index * newWidth
                            };
                            
                            const startMinutes = timeToMinutes(todo.workStartTime);
                            const endMinutes = timeToMinutes(todo.workEndTime);
                            const startHour = Math.floor(startMinutes / 60);
                            const endHour = Math.floor(endMinutes / 60);
                            if (startHour !== endHour && startHour === hour) {
                                spanningTodoLayout.set(todo.id, layout);
                            } else {
                                hourLayout.set(todo.id, layout);
                            }
                        });
                    } else {
                        // 不與延伸過來的重疊，正常分配
                        group.forEach((todo, index) => {
                            const layout = {
                                columnIndex: index,
                                widthPercent: 100 / group.length,
                                leftPercent: (index * 100) / group.length
                            };
                            
                            const startMinutes = timeToMinutes(todo.workStartTime);
                            const endMinutes = timeToMinutes(todo.workEndTime);
                            const startHour = Math.floor(startMinutes / 60);
                            const endHour = Math.floor(endMinutes / 60);
                            if (startHour !== endHour && startHour === hour) {
                                spanningTodoLayout.set(todo.id, layout);
                            } else {
                                hourLayout.set(todo.id, layout);
                            }
                        });
                    }
                });
            } else if (extendingFromPrevious.length > 0) {
                // 如果這個小時只有延伸過來的待辦事項，不需要重新計算布局
                // 它們已經有布局了
            }
            
            // 按起始時間排序所有待辦事項，確保並列時按起始時間排列
            const sortedHourTodos = [...hourTodos].sort((a, b) => {
                return timeToMinutes(a.workStartTime) - timeToMinutes(b.workStartTime);
            });
            
            // 先計算所有待辦事項的寬度，然後再計算位置
            // 這樣可以確保在計算位置時，所有待辦事項的寬度都是已知的
            const todoWidths = new Map();
            sortedHourTodos.forEach(todo => {
                const layout = spanningTodoLayout.get(todo.id) || hourLayout.get(todo.id);
                if (!layout) return;
                
                const startMinutes = timeToMinutes(todo.workStartTime);
                const endMinutes = timeToMinutes(todo.workEndTime);
                const startHour = Math.floor(startMinutes / 60);
                const endHour = Math.floor(endMinutes / 60);
                const isSpanning = startHour !== endHour;
                
                let savedWidth;
                if (isSpanning) {
                    savedWidth = todo.widthPx || (layout.widthPercent / 100 * (timeContent.offsetWidth || 400));
                } else {
                    savedWidth = todo.widthPx || (layout.widthPercent / 100 * (timeContent.offsetWidth || 400));
                }
                todoWidths.set(todo.id, savedWidth);
            });
            
            // 渲染每個待辦事項
            sortedHourTodos.forEach((todo, index) => {
                const startMinutes = timeToMinutes(todo.workStartTime);
                const endMinutes = timeToMinutes(todo.workEndTime);
                const blockStartMinutes = Math.max(startMinutes, hourStartMinutes);
                const blockEndMinutes = Math.min(endMinutes, hourEndMinutes);
                
                // 獲取布局信息（跨小時的用全局布局，不跨小時的用小時內布局）
                const layout = spanningTodoLayout.get(todo.id) || hourLayout.get(todo.id);
                if (!layout) {
                    console.error('找不到待辦事項的布局信息', todo);
                    return;
                }
                
                // 計算位置：根據實際時間段計算 top 和 height
                const topPercent = ((blockStartMinutes - hourStartMinutes) / 60) * 100;
                const heightPercent = ((blockEndMinutes - blockStartMinutes) / 60) * 100;
                
                const startHour = Math.floor(startMinutes / 60);
                const endHour = Math.floor(endMinutes / 60);
                const isSpanning = startHour !== endHour;
                const isStartingHere = startHour === hour;
                
                // 正常渲染待辦事項
                const todoBlock = document.createElement('div');
                todoBlock.className = 'todo-block';
                if (todo.completed) {
                    todoBlock.classList.add('completed');
                }
                todoBlock.dataset.id = todo.id;
                todoBlock.dataset.startTime = todo.workStartTime;
                todoBlock.dataset.endTime = todo.workEndTime;
                
                // 使用絕對定位
                todoBlock.style.position = 'absolute';
                todoBlock.style.top = `${topPercent}%`;
                todoBlock.style.height = `${heightPercent}%`;
                
                // 使用預先計算的寬度
                let savedWidth = todoWidths.get(todo.id) || 120;
                
                // 如果是跨小時的待辦事項，保存寬度到全局
                if (isSpanning && isStartingHere && !todo.widthPx) {
                    todo.widthPx = savedWidth;
                    const todos = loadTodos();
                    const todoIndex = todos.findIndex(t => t.id === todo.id);
                    if (todoIndex >= 0) {
                        todos[todoIndex].widthPx = savedWidth;
                        saveTodos(todos);
                    }
                }
                
                todoBlock.style.width = `${savedWidth}px`;
                todoBlock.style.minWidth = '80px';
                todoBlock.style.maxWidth = 'none';
                
                // 計算左側位置（像素）- 使用預先計算的寬度
                const leftPx = calculateLeftPositionWithWidths(todo, hour, sortedHourTodos, timeContent, todoWidths);
                todoBlock.style.left = `${leftPx}px`;
                
                // 所有待辦事項都可以手動調整大小
                todoBlock.style.resize = 'horizontal';
                todoBlock.style.overflow = 'auto';
                
                if (isSpanning) {
                    todoBlock.classList.add('spans-hours');
                    // 為跨小時的待辦事項添加不同顏色的左邊框
                    // 根據待辦事項的ID生成不同的顏色
                    const colorIndex = todo.id % 5; // 使用5種不同的顏色
                    const colors = ['#e74c3c', '#9b59b6', '#f39c12', '#1abc9c', '#3498db'];
                    todoBlock.style.borderLeftColor = colors[colorIndex];
                    todoBlock.style.borderLeftWidth = '5px';
                }
                
                const todoTime = document.createElement('div');
                todoTime.className = 'todo-block-time';
                todoTime.textContent = `${todo.workStartTime} ～ ${todo.workEndTime}`;
                
                const todoText = document.createElement('div');
                todoText.className = 'todo-block-text';
                todoText.textContent = todo.text || '待辦事項';
                
                todoBlock.appendChild(todoTime);
                todoBlock.appendChild(todoText);
                
                // 監聽寬度變化，保存調整後的寬度（所有待辦事項）
                let resizeTimeout;
                let isUserResizing = false;
                
                // 監聽鼠標按下和釋放，判斷是否是用戶手動調整
                todoBlock.addEventListener('mousedown', (e) => {
                    if (e.offsetX > todoBlock.offsetWidth - 10) {
                        isUserResizing = true;
                    }
                });
                
                todoBlock.addEventListener('mouseup', () => {
                    setTimeout(() => {
                        isUserResizing = false;
                    }, 100);
                });
                
                const resizeObserver = new ResizeObserver(entries => {
                    if (!isUserResizing) return; // 只有用戶手動調整時才保存
                    
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {
                        entries.forEach(entry => {
                            const block = entry.target;
                            const blockId = block.dataset.id;
                            if (blockId) {
                                const todos = loadTodos();
                                const todo = todos.find(t => t.id == blockId);
                                if (todo) {
                                    // 保存當前寬度（像素）
                                    const blockWidth = block.offsetWidth;
                                    todo.widthPx = blockWidth;
                                    
                                    // 如果是跨小時的，更新所有相關的延伸塊和主塊
                                    const startHour = Math.floor(timeToMinutes(todo.workStartTime) / 60);
                                    const endHour = Math.floor(timeToMinutes(todo.workEndTime) / 60);
                                    if (startHour !== endHour) {
                                        // 更新所有小時內的這個待辦事項
                                        document.querySelectorAll(`[data-id="${blockId}"], [data-spanning-id="${blockId}"]`).forEach(relatedBlock => {
                                            relatedBlock.style.width = `${blockWidth}px`;
                                        });
                                    }
                                    
                                    // 重新計算並列框的位置
                                    updateAdjacentBlocksPosition(block, hour, timeContent);
                                    
                                    saveTodos(todos);
                                }
                            }
                        });
                    }, 300); // 防抖，300ms後保存
                });
                resizeObserver.observe(todoBlock);
                
                // 監聽內容變化，調整時間格子的高度（僅對非跨小時的待辦事項）
                // 跨小時的待辦事項不應該觸發高度調整，避免自動放大
                if (startHour === endHour) {
                    const contentObserver = new ResizeObserver(entries => {
                        entries.forEach(entry => {
                            const block = entry.target;
                            const timeSlot = block.closest('.time-slot');
                            if (timeSlot) {
                                const timeContent = timeSlot.querySelector('.time-content');
                                if (timeContent) {
                                    // 計算這個小時內所有待辦事項的最大高度
                                    const blocks = timeContent.querySelectorAll('.todo-block');
                                    let maxHeight = 0;
                                    blocks.forEach(b => {
                                        // 只計算不跨小時的待辦事項
                                        const bStart = timeToMinutes(b.dataset.startTime || '');
                                        const bEnd = timeToMinutes(b.dataset.endTime || '');
                                        const bStartHour = Math.floor(bStart / 60);
                                        const bEndHour = Math.floor(bEnd / 60);
                                        if (bStartHour === bEndHour) {
                                            const rect = b.getBoundingClientRect();
                                            maxHeight = Math.max(maxHeight, rect.height);
                                        }
                                    });
                                    // 設置時間格子的最小高度
                                    if (maxHeight > 0) {
                                        timeContent.style.minHeight = `${maxHeight + 10}px`;
                                        timeSlot.style.minHeight = `${maxHeight + 10}px`;
                                    }
                                }
                            }
                        });
                    });
                    // 保存時間信息到 dataset，方便判斷
                    todoBlock.dataset.startTime = todo.workStartTime;
                    todoBlock.dataset.endTime = todo.workEndTime;
                    contentObserver.observe(todoBlock);
                }
                
                // 點擊待辦事項塊來編輯
                todoBlock.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTodoModal(todo.id);
                });
                
                timeContent.appendChild(todoBlock);
            });
        }
        
        // 空時間段，點擊可添加
        timeContent.classList.add('clickable-slot');
        timeContent.addEventListener('click', (e) => {
            // 如果點擊的是待辦事項塊，不觸發
            if (e.target.closest('.todo-block')) return;
            
            // 預設為整點開始，持續一小時
            // 使用當前小時作為開始時間，分鐘為00
            const startHour = hour;
            const startMinute = 0;
            
            // 預設時間為一小時，整點開始
            openTodoModal(null, startHour, startMinute, 1); // 第三個參數表示小時數
        });
        
        timeSlot.appendChild(timeContent);
        timeSchedule.appendChild(timeSlot);
    }
}

// 刪除 todo
function deleteTodo(id) {
    const todos = loadTodos();
    const filteredTodos = todos.filter(todo => todo.id !== id);
    saveTodos(filteredTodos);
    renderTodos(); // renderTodos 會自動重新編號
    renderCalendar(); // 更新月曆標記
    updateStatistics(); // 更新統計
}

// 打開待辦事項對話框
function openTodoModal(todoId, defaultHour = null, defaultMinute = 0, defaultDurationHours = 1) {
    const modal = document.getElementById('todoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSave = document.getElementById('modalSave');
    const modalDelete = document.getElementById('modalDelete');
    const modalComplete = document.getElementById('modalComplete');
    
    editingTodoId = todoId;
    
    if (todoId) {
        // 編輯模式
        const todos = loadTodos();
        const todo = todos.find(t => t.id === todoId);
        if (!todo) return;
        
        modalTitle.textContent = '編輯待辦事項';
        document.getElementById('modalStartTime').value = todo.workStartTime || '';
        document.getElementById('modalEndTime').value = todo.workEndTime || '';
        document.getElementById('modalTodoText').value = todo.text || '';
        modalDelete.style.display = 'inline-block';
        modalComplete.style.display = todo.completed ? 'none' : 'inline-block';
    } else {
        // 新增模式
        modalTitle.textContent = '新增待辦事項';
        if (defaultHour !== null) {
            // 計算開始時間
            const startTime = `${String(defaultHour).padStart(2, '0')}:${String(defaultMinute).padStart(2, '0')}`;
            
            // 計算結束時間（預設為一小時後）
            const startTotalMinutes = defaultHour * 60 + defaultMinute;
            const endTotalMinutes = startTotalMinutes + (defaultDurationHours * 60);
            const endHour = Math.floor(endTotalMinutes / 60) % 24; // 確保不超過24小時
            const endMinute = endTotalMinutes % 60;
            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
            
            document.getElementById('modalStartTime').value = startTime;
            document.getElementById('modalEndTime').value = endTime;
        } else {
            document.getElementById('modalStartTime').value = '';
            document.getElementById('modalEndTime').value = '';
        }
        document.getElementById('modalTodoText').value = '';
        modalDelete.style.display = 'none';
        modalComplete.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

// 儲存待辦事項
function saveTodoFromModal() {
    const startTime = document.getElementById('modalStartTime').value;
    const endTime = document.getElementById('modalEndTime').value;
    const text = document.getElementById('modalTodoText').value.trim();
    
    if (!startTime || !endTime) {
        alert('請輸入開始時間和結束時間');
        return;
    }
    
    if (!text) {
        alert('請輸入事項內容');
        return;
    }
    
    const todos = loadTodos();
    const dueDate = selectedDate || (() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    })();
    
    if (editingTodoId) {
        // 更新
        const todo = todos.find(t => t.id === editingTodoId);
        if (todo) {
            todo.text = text;
            todo.dueDate = dueDate;
            todo.workStartTime = startTime;
            todo.workEndTime = endTime;
        }
    } else {
        // 新增
        const newTodo = {
            id: getNextId(todos),
            text: text,
            dueDate: dueDate,
            workStartTime: startTime,
            workEndTime: endTime,
            notes: [],
            completed: false
        };
        todos.push(newTodo);
    }
    
    saveTodos(todos);
    closeTodoModal();
    renderTodos();
    renderCalendar();
    updateStatistics();
}

// 刪除待辦事項
function deleteTodoFromModal() {
    if (!editingTodoId) return;
    
    if (confirm('確定要刪除此待辦事項嗎？')) {
        const todos = loadTodos();
        const filteredTodos = todos.filter(todo => todo.id !== editingTodoId);
        saveTodos(filteredTodos);
        closeTodoModal();
        renderTodos();
        renderCalendar();
        updateStatistics();
    }
}

// 完成待辦事項
function completeTodoFromModal() {
    if (!editingTodoId) return;
    
    const todos = loadTodos();
    const todo = todos.find(t => t.id === editingTodoId);
    if (todo) {
        todo.completed = true;
        saveTodos(todos);
        showConfetti();
        closeTodoModal();
        renderTodos();
        renderCalendar();
        updateStatistics();
        
        // 2秒後移除
        setTimeout(() => {
            const filteredTodos = todos.filter(t => t.id !== editingTodoId);
            saveTodos(filteredTodos);
            renderTodos();
            renderCalendar();
            updateStatistics();
        }, 2000);
    }
}

// 關閉對話框
function closeTodoModal() {
    document.getElementById('todoModal').style.display = 'none';
    editingTodoId = null;
}

// 完成 todo
function completeTodo(id) {
    const todos = loadTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = true;
        saveTodos(todos);
        showConfetti();
        updateStatistics();
        // 延遲後移除該項目
        setTimeout(() => {
            const filteredTodos = todos.filter(t => t.id !== id);
            saveTodos(filteredTodos);
            renderTodos();
            renderCalendar();
            updateStatistics();
        }, 2000);
    }
}

// 顯示彩帶動畫（飄揚彩帶+小星星）
function showConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8c00', '#ff1493'];
    const confettiCount = 150;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // 彩帶
        if (i < 100) {
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 30 + 20) + 'px';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        } else {
            // 小星星
            confetti.innerHTML = '★';
            confetti.style.fontSize = (Math.random() * 15 + 10) + 'px';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.classList.add('star');
        }
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 4000);
    }
}


// 月曆功能
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const calendarTitle = document.getElementById('calendarTitle');
    calendarDays.innerHTML = '';
    
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    calendarTitle.textContent = `${currentYear}年 ${monthNames[currentMonth]}`;
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // 獲取所有待辦事項的日期
    const todos = loadTodos();
    const todoDates = new Set();
    todos.forEach(todo => {
        if (todo.dueDate) {
            todoDates.add(todo.dueDate);
        }
    });
    
    // 填充空白
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDay);
    }
    
    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (todoDates.has(dateString)) {
            dayElement.classList.add('has-todo');
        }
        
        // 標記今天
        const today = new Date();
        if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        // 標記選中的日期
        if (selectedDate === dateString) {
            dayElement.classList.add('selected');
        }
        
        // 點擊日期事件
        dayElement.addEventListener('click', () => {
            // 如果點擊的是已選中的日期，則清除選中
            if (selectedDate === dateString) {
                selectedDate = null;
                dayElement.classList.remove('selected');
            } else {
                // 移除其他選中狀態
                document.querySelectorAll('.calendar-day.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                dayElement.classList.add('selected');
                selectedDate = dateString;
            }
            renderTodos();
            renderCalendar(); // 重新渲染以更新選中狀態
            updateStatistics(); // 更新統計
        });
        
        calendarDays.appendChild(dayElement);
    }
}

function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    // 切換月份時清除選中日期
    selectedDate = null;
    renderCalendar();
    renderTodos(); // 重新渲染以更新月曆標記
}

// 統計功能
function updateStatistics() {
    const todos = loadTodos();
    const displayTodos = selectedDate ? 
        todos.filter(todo => todo.dueDate === selectedDate) : 
        todos;
    
    const total = displayTodos.length;
    const completed = displayTodos.filter(todo => todo.completed).length;
    const remaining = total - completed;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('remainingCount').textContent = remaining;
    
    // 計算工作時間（所有待辦事項的時間總和，以小時為單位）
    let totalWorkMinutes = 0;
    displayTodos.forEach(todo => {
        if (todo.workStartTime && todo.workEndTime) {
            const startMinutes = timeToMinutes(todo.workStartTime);
            const endMinutes = timeToMinutes(todo.workEndTime);
            if (endMinutes > startMinutes) {
                totalWorkMinutes += (endMinutes - startMinutes);
            }
        }
    });
    const workHours = (totalWorkMinutes / 60).toFixed(1);
    document.getElementById('workTime').textContent = workHours;
    
    // 計算休息時間（從番茄鐘和休息時鐘獲取，這裡先設為0，後續可以從實際計時器獲取）
    // 注意：這裡需要從實際的計時器狀態獲取，暫時設為0
    const restHours = '0.0';
    document.getElementById('restTime').textContent = restHours;
}

// 番茄鐘功能
let pomodoroTimer = null;
let pomodoroTimeLeft = 50 * 60; // 預設50分鐘（秒）
let pomodoroTotalTime = 50 * 60; // 總時間
let pomodoroRunning = false;
let pomodoroMode = 'work'; // 'work' 或 'break'

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    document.getElementById('pomodoroTime').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    updatePomodoroClockHands();
}

function updatePomodoroClockHands() {
    const remainingSeconds = pomodoroTimeLeft;
    const elapsedSeconds = pomodoroTotalTime - remainingSeconds;
    
    // 分鐘指針：基於總時間的進度
    const minuteAngle = (elapsedSeconds / pomodoroTotalTime) * 360;
    
    // 時針：基於分鐘指針，稍微偏移
    const hourAngle = (elapsedSeconds / pomodoroTotalTime) * 30; // 時針每小時30度
    
    const minuteHand = document.getElementById('pomodoroMinuteHand');
    const hourHand = document.getElementById('pomodoroHourHand');
    
    minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
    hourHand.style.transform = `rotate(${hourAngle}deg)`;
}

function startPomodoro() {
    if (!pomodoroRunning) {
        pomodoroRunning = true;
        document.getElementById('pomodoroStatus').textContent = pomodoroMode === 'work' ? '工作中...' : '休息中...';
        
        pomodoroTimer = setInterval(() => {
            pomodoroTimeLeft--;
            updatePomodoroDisplay();
            
            if (pomodoroTimeLeft <= 0) {
                clearInterval(pomodoroTimer);
                pomodoroRunning = false;
                
                // 工作時間到
                document.getElementById('pomodoroStatus').textContent = '站起來動一動，該喝水了';
                showPomodoroAlert();
                updatePomodoroClockHands();
            }
        }, 1000);
    }
}

function pausePomodoro() {
    if (pomodoroRunning) {
        clearInterval(pomodoroTimer);
        pomodoroRunning = false;
        document.getElementById('pomodoroStatus').textContent = '已暫停';
    }
}

function resetPomodoro() {
    clearInterval(pomodoroTimer);
    pomodoroRunning = false;
    const duration = parseInt(document.getElementById('pomodoroDuration').value) || 50;
    pomodoroTotalTime = Math.min(60, Math.max(1, duration)) * 60; // 限制在1-60分鐘
    pomodoroTimeLeft = pomodoroTotalTime;
    updatePomodoroDisplay();
    document.getElementById('pomodoroStatus').textContent = '準備開始';
    updatePomodoroClockHands();
}

// 顯示番茄鐘提醒畫面
function showPomodoroAlert() {
    const alert = document.getElementById('pomodoroAlert');
    alert.style.display = 'flex';
    
    // 5秒後自動關閉
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// 小時鐘功能（休息時間）
let studyTimer = null;
let studyTimeElapsed = 0; // 秒
let studyRunning = false;
let studyAlertShown = false;
let restTargetSeconds = 0; // 目標休息時間（秒）

function updateStudyClock() {
    const hours = Math.floor(studyTimeElapsed / 3600);
    const minutes = Math.floor((studyTimeElapsed % 3600) / 60);
    const seconds = studyTimeElapsed % 60;
    document.getElementById('studyTime').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // 達到設定的休息時間時提醒
    if (restTargetSeconds > 0 && studyTimeElapsed >= restTargetSeconds && !studyAlertShown) {
        showRestAlert();
        studyAlertShown = true;
        setTimeout(() => {
            studyAlertShown = false;
        }, 10000); // 10秒內不重複顯示
    }
}

function startStudyClock() {
    if (!studyRunning) {
        studyRunning = true;
        // 獲取設定的休息時間（小時和分鐘）
        const restHours = parseInt(document.getElementById('restHours').value) || 0;
        const restMinutes = parseInt(document.getElementById('restMinutes').value) || 0;
        restTargetSeconds = (restHours * 3600) + (restMinutes * 60);
        studyTimer = setInterval(() => {
            studyTimeElapsed++;
            updateStudyClock();
        }, 1000);
    }
}

function stopStudyClock() {
    if (studyRunning) {
        clearInterval(studyTimer);
        studyRunning = false;
    }
}

function resetStudyClock() {
    clearInterval(studyTimer);
    studyRunning = false;
    studyTimeElapsed = 0;
    studyAlertShown = false;
    restTargetSeconds = 0;
    updateStudyClock();
}

// 顯示休息時間提醒畫面
function showRestAlert() {
    const alert = document.getElementById('restAlert');
    alert.style.display = 'flex';
    
    // 5秒後自動關閉
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// 可拖動調整面板大小
function initResizers() {
    // 水平分隔線（左右面板之間）
    const resizer1 = document.getElementById('resizer1');
    const resizer2 = document.getElementById('resizer2');
    const leftPanel = document.getElementById('leftPanel');
    const middlePanel = document.getElementById('middlePanel');
    const rightPanel = document.getElementById('rightPanel');
    
    let isResizing1 = false;
    let isResizing2 = false;
    
    resizer1.addEventListener('mousedown', (e) => {
        isResizing1 = true;
        document.addEventListener('mousemove', handleResize1);
        document.addEventListener('mouseup', stopResize1);
    });
    
    resizer2.addEventListener('mousedown', (e) => {
        isResizing2 = true;
        document.addEventListener('mousemove', handleResize2);
        document.addEventListener('mouseup', stopResize2);
    });
    
    function handleResize1(e) {
        if (!isResizing1) return;
        e.preventDefault();
        const leftPercent = Math.max(10, Math.min(60, (e.clientX / window.innerWidth) * 100));
        const currentRightPercent = parseFloat(getComputedStyle(rightPanel).width) / window.innerWidth * 100 || 33.33;
        const middlePercent = 100 - leftPercent - currentRightPercent;
        
        if (middlePercent >= 10 && leftPercent >= 10) {
            leftPanel.style.width = leftPercent + '%';
            middlePanel.style.width = middlePercent + '%';
        }
    }
    
    function handleResize2(e) {
        if (!isResizing2) return;
        e.preventDefault();
        const rightPercent = Math.max(10, Math.min(60, ((window.innerWidth - e.clientX) / window.innerWidth) * 100));
        const currentLeftPercent = parseFloat(getComputedStyle(leftPanel).width) / window.innerWidth * 100 || 33.33;
        const middlePercent = 100 - currentLeftPercent - rightPercent;
        
        if (middlePercent >= 10 && rightPercent >= 10) {
            rightPanel.style.width = rightPercent + '%';
            middlePanel.style.width = middlePercent + '%';
        }
    }
    
    function stopResize1() {
        isResizing1 = false;
        document.removeEventListener('mousemove', handleResize1);
        document.removeEventListener('mouseup', stopResize1);
    }
    
    function stopResize2() {
        isResizing2 = false;
        document.removeEventListener('mousemove', handleResize2);
        document.removeEventListener('mouseup', stopResize2);
    }
    
    // 垂直分隔線（左側面板：月曆和統計）
    const leftVerticalResizer = document.getElementById('leftVerticalResizer');
    const calendarSection = document.getElementById('calendarSection');
    const statisticsSection = document.getElementById('statisticsSection');
    
    let isResizingLeftVertical = false;
    
    leftVerticalResizer.addEventListener('mousedown', (e) => {
        isResizingLeftVertical = true;
        document.addEventListener('mousemove', handleLeftVerticalResize);
        document.addEventListener('mouseup', stopLeftVerticalResize);
    });
    
    function handleLeftVerticalResize(e) {
        if (!isResizingLeftVertical) return;
        e.preventDefault();
        const panelHeight = leftPanel.clientHeight;
        const yPercent = Math.max(20, Math.min(80, (e.clientY - leftPanel.offsetTop) / panelHeight * 100));
        
        calendarSection.style.flex = `${yPercent}`;
        statisticsSection.style.flex = `${100 - yPercent}`;
    }
    
    function stopLeftVerticalResize() {
        isResizingLeftVertical = false;
        document.removeEventListener('mousemove', handleLeftVerticalResize);
        document.removeEventListener('mouseup', stopLeftVerticalResize);
    }
    
    // 垂直分隔線（右側面板：番茄鐘和休息時間）
    const rightVerticalResizer = document.getElementById('rightVerticalResizer');
    const pomodoroContainer = document.getElementById('pomodoroContainer');
    const studyClockContainer = document.getElementById('studyClockContainer');
    
    let isResizingRightVertical = false;
    
    rightVerticalResizer.addEventListener('mousedown', (e) => {
        isResizingRightVertical = true;
        document.addEventListener('mousemove', handleRightVerticalResize);
        document.addEventListener('mouseup', stopRightVerticalResize);
    });
    
    function handleRightVerticalResize(e) {
        if (!isResizingRightVertical) return;
        e.preventDefault();
        const panelHeight = rightPanel.clientHeight;
        const yPercent = Math.max(20, Math.min(80, (e.clientY - rightPanel.offsetTop) / panelHeight * 100));
        
        pomodoroContainer.style.flex = `${yPercent}`;
        studyClockContainer.style.flex = `${100 - yPercent}`;
    }
    
    function stopRightVerticalResize() {
        isResizingRightVertical = false;
        document.removeEventListener('mousemove', handleRightVerticalResize);
        document.removeEventListener('mouseup', stopRightVerticalResize);
    }
}

// 初始化應用程式
function initApp() {
    renderTodos();
    renderCalendar();
    updateStatistics();
    
    // 載入工作心情提醒
    loadMoodReminder();
    
    // 保存工作心情提醒（當用戶輸入時）
    const moodReminderInput = document.getElementById('moodReminder');
    if (moodReminderInput) {
        moodReminderInput.addEventListener('input', saveMoodReminder);
        moodReminderInput.addEventListener('blur', saveMoodReminder);
    }
    
    // 初始化番茄鐘
    const pomodoroDurationInput = document.getElementById('pomodoroDuration');
    pomodoroDurationInput.addEventListener('change', () => {
        if (!pomodoroRunning) {
            resetPomodoro();
        }
    });
    
    updatePomodoroDisplay();
    updatePomodoroClockHands(); // 初始化指針位置
    updateStudyClock();
    initResizers();
    
    // 統計區域分隔線調整
    const statisticsResizer = document.getElementById('statisticsResizer');
    const statisticsLeft = document.getElementById('statisticsLeft');
    const statisticsRight = document.getElementById('statisticsRight');
    const statisticsSection = document.getElementById('statisticsSection');
    
    let isStatisticsResizing = false;
    
    if (statisticsResizer && statisticsLeft && statisticsRight) {
        statisticsResizer.addEventListener('mousedown', (e) => {
            isStatisticsResizing = true;
            document.addEventListener('mousemove', handleStatisticsResize);
            document.addEventListener('mouseup', stopStatisticsResize);
        });
        
        function handleStatisticsResize(e) {
            if (!isStatisticsResizing) return;
            e.preventDefault();
            const sectionRect = statisticsSection.getBoundingClientRect();
            const mouseX = e.clientX - sectionRect.left;
            const sectionWidth = sectionRect.width;
            const leftPercent = Math.max(20, Math.min(80, (mouseX / sectionWidth) * 100));
            
            statisticsLeft.style.flex = `0 0 ${leftPercent}%`;
            statisticsRight.style.flex = `0 0 ${100 - leftPercent}%`;
        }
        
        function stopStatisticsResize() {
            isStatisticsResizing = false;
            document.removeEventListener('mousemove', handleStatisticsResize);
            document.removeEventListener('mouseup', stopStatisticsResize);
        }
    }
    
    // 對話框按鈕事件
    document.getElementById('modalSave').addEventListener('click', saveTodoFromModal);
    document.getElementById('modalCancel').addEventListener('click', closeTodoModal);
    document.getElementById('modalDelete').addEventListener('click', deleteTodoFromModal);
    document.getElementById('modalComplete').addEventListener('click', completeTodoFromModal);
    
    // 點擊對話框外部關閉
    document.getElementById('todoModal').addEventListener('click', (e) => {
        if (e.target.id === 'todoModal') {
            closeTodoModal();
        }
    });
    
    // 月曆導航
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    // 番茄鐘按鈕
    document.getElementById('pomodoroStart').addEventListener('click', startPomodoro);
    document.getElementById('pomodoroPause').addEventListener('click', pausePomodoro);
    document.getElementById('pomodoroReset').addEventListener('click', resetPomodoro);
    
    // 小時鐘按鈕
    document.getElementById('studyStart').addEventListener('click', startStudyClock);
    document.getElementById('studyStop').addEventListener('click', stopStudyClock);
    document.getElementById('studyReset').addEventListener('click', resetStudyClock);
}

// 設置登入/註冊事件處理
function setupAuthHandlers() {
    // 檢查元素是否存在
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!loginTab || !registerTab || !loginBtn || !registerBtn) {
        console.error('登入/註冊元素未找到');
        return;
    }
    
    // 切換登入/註冊標籤
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        if (document.getElementById('forgotPasswordForm')) {
            document.getElementById('forgotPasswordForm').style.display = 'none';
        }
        document.getElementById('loginMessage').textContent = '';
        document.getElementById('registerMessage').textContent = '';
    });
    
    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
        if (document.getElementById('forgotPasswordForm')) {
            document.getElementById('forgotPasswordForm').style.display = 'none';
        }
        document.getElementById('loginMessage').textContent = '';
        document.getElementById('registerMessage').textContent = '';
    });
    
    // 登入按鈕
    loginBtn.addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const messageEl = document.getElementById('loginMessage');
        
        if (!username || !password) {
            messageEl.textContent = '請輸入用戶名和密碼';
            messageEl.style.color = '#e74c3c';
            return;
        }
        
        const result = loginUser(username, password);
        if (result.success) {
            messageEl.textContent = result.message;
            messageEl.style.color = '#27ae60';
            setTimeout(() => {
                showMainApp();
            }, 500);
        } else {
            messageEl.textContent = result.message;
            messageEl.style.color = '#e74c3c';
        }
    });
    
    // 註冊按鈕
    registerBtn.addEventListener('click', () => {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const messageEl = document.getElementById('registerMessage');
        
        if (!username || !email || !password) {
            messageEl.textContent = '請填寫所有必填欄位';
            messageEl.style.color = '#e74c3c';
            return;
        }
        
        if (password !== passwordConfirm) {
            messageEl.textContent = '兩次輸入的密碼不一致';
            messageEl.style.color = '#e74c3c';
            return;
        }
        
        if (password.length < 4) {
            messageEl.textContent = '密碼長度至少需要4個字符';
            messageEl.style.color = '#e74c3c';
            return;
        }
        
        const result = registerUser(username, email, password);
        if (result.success) {
            messageEl.textContent = result.message;
            messageEl.style.color = '#27ae60';
            setTimeout(() => {
                // 自動登入
                currentUser = username;
                localStorage.setItem('currentUser', username);
                showMainApp();
            }, 500);
        } else {
            messageEl.textContent = result.message;
            messageEl.style.color = '#e74c3c';
        }
    });
    
    // 登出按鈕
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
        if (confirm('確定要登出嗎？')) {
            logoutUser();
            // 清空表單
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerPasswordConfirm').value = '';
            showLoginScreen();
        }
        });
    }
    
    // 按 Enter 鍵登入/註冊
    const loginPassword = document.getElementById('loginPassword');
    const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
        });
    }
    
    if (registerPasswordConfirm) {
        registerPasswordConfirm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                registerBtn.click();
            }
        });
    }
    
    // 忘記密碼連結
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'none';
            forgotPasswordForm.style.display = 'block';
            loginTab.classList.remove('active');
            registerTab.classList.remove('active');
        });
    }
    
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            forgotPasswordForm.style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
            loginTab.classList.add('active');
            const forgotMessage = document.getElementById('forgotPasswordMessage');
            if (forgotMessage) {
                forgotMessage.textContent = '';
            }
            const forgotEmail = document.getElementById('forgotEmail');
            if (forgotEmail) {
                forgotEmail.value = '';
            }
        });
    }
    
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', () => {
            const email = document.getElementById('forgotEmail').value.trim();
            const messageEl = document.getElementById('forgotPasswordMessage');
            
            if (!email) {
                messageEl.textContent = '請輸入電子郵件';
                messageEl.style.color = '#e74c3c';
                return;
            }
            
            const result = forgotPassword(email);
            if (result.success) {
                messageEl.innerHTML = result.message.replace(/\n/g, '<br>');
                messageEl.style.color = '#27ae60';
            } else {
                messageEl.textContent = result.message;
                messageEl.style.color = '#e74c3c';
            }
        });
    }
}

// 顯示登入畫面
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

// 顯示主應用程式
function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('currentUserName').textContent = currentUser;
    
    // 初始化應用程式
    initApp();
}

// DOMContentLoaded 事件處理器
document.addEventListener('DOMContentLoaded', () => {
    // 檢查是否已登入
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        showMainApp();
    } else {
        showLoginScreen();
    }
    
    // 登入/註冊事件處理
    setupAuthHandlers();
});
