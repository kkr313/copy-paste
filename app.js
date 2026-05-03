const STORAGE_KEY = 'copyPasteItems';
const TAGS_KEY = 'copyPasteTags';
const SELECTED_TAGS_KEY = 'copyPasteSelectedTags';
let items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let tags = JSON.parse(localStorage.getItem(TAGS_KEY)) || [];
let selectedTags = JSON.parse(localStorage.getItem(SELECTED_TAGS_KEY)) || [];
let activeFilterTag = '__all__';
let editingId = null;
let draggedIndex = null;

// Initialize selected tags - if empty, select all by default
function initSelectedTags() {
    if (selectedTags.length === 0 && tags.length > 0) {
        selectedTags = [...tags, '__untagged__'];
        saveSelectedTags();
    }
    selectedTags = selectedTags.filter(t => t === '__untagged__' || tags.includes(t));
    saveSelectedTags();
}

// Save selected tags to localStorage
function saveSelectedTags() {
    localStorage.setItem(SELECTED_TAGS_KEY, JSON.stringify(selectedTags));
}

// Save tags to localStorage
function saveTags() {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

// Populate tag dropdowns
function populateTagDropdowns() {
    const tagInput = document.getElementById('tagInput');
    const editTag = document.getElementById('editTag');
    
    const options = '<option value="">No Tag</option>' + 
        tags.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    
    tagInput.innerHTML = options;
    editTag.innerHTML = options;
}

// Render active filter tabs (only checked tags from Manage Tags)
function renderTabs() {
    const container = document.getElementById('tabsContainer');
    
    const tagCounts = {};
    tags.forEach(t => tagCounts[t] = 0);
    items.forEach(item => {
        if (item.tag && tagCounts.hasOwnProperty(item.tag)) {
            tagCounts[item.tag]++;
        }
    });
    
    const untaggedCount = items.filter(i => !i.tag).length;
    
    let totalCount = 0;
    selectedTags.forEach(tag => {
        if (tag === '__untagged__') {
            totalCount += untaggedCount;
        } else if (tagCounts[tag] !== undefined) {
            totalCount += tagCounts[tag];
        }
    });
    
    let html = '';
    
    if (selectedTags.length === 0) {
        html = '<span style="color: #64748b; font-size: 0.85rem;">No tags selected. Go to Manage Tags to enable filters.</span>';
    } else {
        if (selectedTags.length > 1) {
            html += `<div class="tab ${activeFilterTag === '__all__' ? 'active' : ''}" onclick="setActiveFilterTag('__all__')">
                All <span class="count">${totalCount}</span>
            </div>`;
        }
        
        selectedTags.forEach(tag => {
            if (tag === '__untagged__') {
                html += `<div class="tab ${activeFilterTag === '__untagged__' ? 'active' : ''}" onclick="setActiveFilterTag('__untagged__')">
                    Untagged <span class="count">${untaggedCount}</span>
                </div>`;
            } else if (tags.includes(tag)) {
                html += `<div class="tab ${activeFilterTag === tag ? 'active' : ''}" onclick="setActiveFilterTag('${escapeHtml(tag)}')">
                    ${escapeHtml(tag)} <span class="count">${tagCounts[tag]}</span>
                </div>`;
            }
        });
    }
    
    container.innerHTML = html;
}

// Set active filter tag
function setActiveFilterTag(tag) {
    activeFilterTag = tag;
    renderTabs();
    render();
}

// Get filtered items based on selected checkboxes and active tab
function getFilteredItems() {
    if (selectedTags.length === 0) return [];
    
    if (activeFilterTag === '__all__') {
        return items.filter(item => {
            if (!item.tag) {
                return selectedTags.includes('__untagged__');
            }
            return selectedTags.includes(item.tag);
        });
    }
    
    if (activeFilterTag === '__untagged__') {
        return items.filter(i => !i.tag);
    }
    
    return items.filter(i => i.tag === activeFilterTag);
}

// Drag and Drop handlers
function handleDragStart(e) {
    draggedIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.item-card').forEach(card => {
        card.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    const targetIndex = parseInt(this.dataset.index);
    
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
        const draggedItem = items[draggedIndex];
        items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, draggedItem);
        
        save();
        render();
        showToast('Order updated!');
    }
    
    draggedIndex = null;
}

// Render items as cards
function render() {
    const container = document.getElementById('itemsContainer');
    const empty = document.getElementById('emptyState');
    const searchQuery = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    let filteredItems = getFilteredItems();
    
    // Apply search filter
    if (searchQuery) {
        filteredItems = filteredItems.filter(item => 
            item.label.toLowerCase().includes(searchQuery) || 
            item.content.toLowerCase().includes(searchQuery) ||
            (item.tag && item.tag.toLowerCase().includes(searchQuery))
        );
    }

    // When "All" is selected, group items by tag continuously
    if (activeFilterTag === '__all__' && !searchQuery) {
        const grouped = [];
        const tagOrder = [...tags.filter(t => selectedTags.includes(t))];
        if (selectedTags.includes('__untagged__')) tagOrder.push(null);
        tagOrder.forEach(tag => {
            const tagItems = filteredItems.filter(i => (i.tag || null) === tag);
            grouped.push(...tagItems);
        });
        filteredItems = grouped;
    }
    
    container.innerHTML = '';
    
    if (filteredItems.length === 0) {
        empty.style.display = 'block';
        empty.querySelector('p').textContent = searchQuery ? 'No matching snippets found.' : (activeFilterTag && activeFilterTag !== '__all__' ? 'No items with this tag.' : 'No items yet. Add your first snippet above!');
        return;
    }
    
    empty.style.display = 'none';

    // Show tag badge only when "All" is selected
    const showTagBadge = activeFilterTag === '__all__';
    
    filteredItems.forEach((item, index) => {
        const originalIndex = items.indexOf(item);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.draggable = true;
        card.dataset.index = originalIndex;
        card.style.animationDelay = `${index * 0.03}s`;
        const tagHtml = (showTagBadge && item.tag) ? `<span class="tag-badge">${escapeHtml(item.tag)}</span>` : '';
        card.innerHTML = `
            <div class="item-card-top">
                <div class="item-card-meta">
                    <span class="label-badge">${escapeHtml(item.label)}</span>${tagHtml}
                </div>
                <div class="item-card-actions">
                    <button class="btn btn-copy" onclick="copyItem('${item.id}')">📋 Copy</button>
                    <button class="btn btn-edit" onclick="editItem('${item.id}')">✏️ Edit</button>
                    <button class="btn btn-delete" onclick="deleteItem('${item.id}')">🗑️ Delete</button>
                </div>
            </div>
            <div class="item-card-content">${escapeHtml(item.content)}</div>
        `;
        
        // Drag events
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', handleDrop);
        
        container.appendChild(card);
    });
    
    renderTabs();
}

// Escape HTML
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Save to localStorage
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Check for duplicate labels
function checkDuplicateLabel(label, tag, excludeId = null) {
    const normalizedLabel = label.toLowerCase();
    const normalizedTag = tag || null;
    
    const sameTagDuplicate = items.find(i => 
        i.label.toLowerCase() === normalizedLabel && 
        i.tag === normalizedTag &&
        i.id !== excludeId
    );
    
    if (sameTagDuplicate) {
        return { type: 'error', message: `Label "${label}" already exists in ${tag || 'Untagged'} group!` };
    }
    
    const otherTagItems = items.filter(i => 
        i.label.toLowerCase() === normalizedLabel && 
        i.tag !== normalizedTag &&
        i.id !== excludeId
    );
    
    if (otherTagItems.length > 0) {
        const otherTags = [...new Set(otherTagItems.map(i => i.tag || 'Untagged'))];
        return { type: 'warning', message: `Label "${label}" also exists in: ${otherTags.join(', ')}` };
    }
    
    return null;
}

// Add new item
function addItem() {
    const label = document.getElementById('labelInput').value.trim();
    const content = document.getElementById('contentInput').value.trim();
    const tag = document.getElementById('tagInput').value;
    
    if (!label) {
        showToast('Please enter a label!', 'error');
        return;
    }
    if (!content) {
        showToast('Please enter content!', 'error');
        return;
    }
    
    const duplicateCheck = checkDuplicateLabel(label, tag || null);
    if (duplicateCheck) {
        if (duplicateCheck.type === 'error') {
            showToast(duplicateCheck.message, 'error');
            return;
        }
        if (duplicateCheck.type === 'warning') {
            showToast(duplicateCheck.message, 'warning');
        }
    }
    
    items.unshift({
        id: Date.now().toString(),
        label: label,
        content: content,
        tag: tag || null
    });
    
    save();
    render();
    
    document.getElementById('labelInput').value = '';
    document.getElementById('contentInput').value = '';
    document.getElementById('tagInput').value = '';
    
    showToast('Item added successfully!');
}

// Copy item
function copyItem(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        navigator.clipboard.writeText(item.content).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = item.content;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Copied to clipboard!');
        });
    }
}

// Edit item
function editItem(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        editingId = id;
        document.getElementById('editLabel').value = item.label;
        document.getElementById('editTag').value = item.tag || '';
        document.getElementById('editContent').value = item.content;
        document.getElementById('editModal').classList.add('show');
    }
}

// Save edit
function saveEdit() {
    const label = document.getElementById('editLabel').value.trim();
    const content = document.getElementById('editContent').value.trim();
    const tag = document.getElementById('editTag').value;
    
    if (!label || !content) {
        showToast('Please fill all fields!', 'error');
        return;
    }
    
    const duplicateCheck = checkDuplicateLabel(label, tag || null, editingId);
    if (duplicateCheck) {
        if (duplicateCheck.type === 'error') {
            showToast(duplicateCheck.message, 'error');
            return;
        }
        if (duplicateCheck.type === 'warning') {
            showToast(duplicateCheck.message, 'warning');
        }
    }
    
    const item = items.find(i => i.id === editingId);
    if (item) {
        item.label = label;
        item.content = content;
        item.tag = tag || null;
        save();
        render();
        closeModal();
        showToast('Item updated!');
    }
}

// Close modal
function closeModal() {
    document.getElementById('editModal').classList.remove('show');
    editingId = null;
}

// Delete item
function deleteItem(id) {
    if (confirm('Delete this item?')) {
        items = items.filter(i => i.id !== id);
        save();
        render();
        showToast('Item deleted!');
    }
}

// Export: open modal with tag selection
function openExportModal() {
    if (items.length === 0) {
        showToast('No items to export!', 'error');
        return;
    }
    renderExportTagList();
    document.getElementById('exportModal').classList.add('show');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.remove('show');
}

function renderExportTagList() {
    const container = document.getElementById('exportTagList');
    container.innerHTML = '';

    const tagCounts = {};
    tags.forEach(t => tagCounts[t] = 0);
    items.forEach(item => {
        if (item.tag && tagCounts.hasOwnProperty(item.tag)) tagCounts[item.tag]++;
    });
    const untaggedCount = items.filter(i => !i.tag).length;

    tags.forEach((tag, idx) => {
        const div = document.createElement('div');
        div.className = 'tag-item';
        const left = document.createElement('div');
        left.className = 'tag-item-left';
        left.style.gap = '10px';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'export-tag-cb';
        cb.value = tag;
        cb.checked = true;
        cb.id = `exp-tag-${idx}`;
        cb.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:#7b2ff7;flex-shrink:0;';

        const lbl = document.createElement('label');
        lbl.htmlFor = `exp-tag-${idx}`;
        lbl.style.cssText = 'cursor:pointer;display:flex;gap:8px;align-items:center;';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'tag-item-name';
        nameSpan.textContent = tag;
        const countSpan = document.createElement('span');
        countSpan.className = 'tag-item-count';
        countSpan.textContent = `${tagCounts[tag]} items`;
        lbl.appendChild(nameSpan);
        lbl.appendChild(countSpan);

        left.appendChild(cb);
        left.appendChild(lbl);
        div.appendChild(left);
        container.appendChild(div);
    });

    if (untaggedCount > 0) {
        const div = document.createElement('div');
        div.className = 'tag-item';
        const left = document.createElement('div');
        left.className = 'tag-item-left';
        left.style.gap = '10px';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'export-tag-cb';
        cb.value = '__untagged__';
        cb.checked = true;
        cb.id = 'exp-tag-untagged';
        cb.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:#7b2ff7;flex-shrink:0;';

        const lbl = document.createElement('label');
        lbl.htmlFor = 'exp-tag-untagged';
        lbl.style.cssText = 'cursor:pointer;display:flex;gap:8px;align-items:center;';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'tag-item-name';
        nameSpan.textContent = 'Untagged';
        const countSpan = document.createElement('span');
        countSpan.className = 'tag-item-count';
        countSpan.textContent = `${untaggedCount} items`;
        lbl.appendChild(nameSpan);
        lbl.appendChild(countSpan);

        left.appendChild(cb);
        left.appendChild(lbl);
        div.appendChild(left);
        container.appendChild(div);
    }

    if (container.children.length === 0) {
        container.innerHTML = '<p style="color:#64748b;text-align:center;padding:20px;">No tags available.</p>';
    }
}

function selectAllExportTags() {
    document.querySelectorAll('.export-tag-cb').forEach(cb => cb.checked = true);
}

function deselectAllExportTags() {
    document.querySelectorAll('.export-tag-cb').forEach(cb => cb.checked = false);
}

function performExport() {
    const chosen = Array.from(document.querySelectorAll('.export-tag-cb:checked')).map(cb => cb.value);

    if (chosen.length === 0) {
        showToast('Please select at least one tag!', 'error');
        return;
    }

    const exportItems = items.filter(item => {
        if (!item.tag) return chosen.includes('__untagged__');
        return chosen.includes(item.tag);
    });

    if (exportItems.length === 0) {
        showToast('No items found for selected tags!', 'error');
        return;
    }

    const blob = new Blob([JSON.stringify(exportItems, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const totalOptions = tags.length + (items.some(i => !i.tag) ? 1 : 0);
    const isAll = chosen.length === totalOptions;
    let filename;
    if (isAll) {
        filename = 'copy-paste-backup.json';
    } else {
        const tagPart = chosen
            .filter(v => v !== '__untagged__')
            .map(v => v.replace(/[^a-zA-Z0-9-_]/g, '_'))
            .join('-');
        const untaggedPart = chosen.includes('__untagged__')
            ? (tagPart ? '-untagged' : 'untagged') : '';
        filename = `copy-paste-backup-${tagPart}${untaggedPart}.json`;
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeExportModal();
    showToast(`Exported ${exportItems.length} item${exportItems.length !== 1 ? 's' : ''}!`);
}

// Import data
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            if (Array.isArray(imported)) {
                const newItems = imported.filter(imp => 
                    !items.some(i => i.content === imp.content)
                );
                
                const importedTags = [...new Set(newItems.map(i => i.tag).filter(t => t && !tags.includes(t)))];
                if (importedTags.length > 0) {
                    tags = [...tags, ...importedTags];
                    saveTags();
                    populateTagDropdowns();
                }
                
                items = [...newItems.map(i => ({
                    id: Date.now().toString() + Math.random(),
                    label: i.label || 'Imported',
                    content: i.content,
                    tag: i.tag || null
                })), ...items];
                save();
                render();
                showToast(`Imported ${newItems.length} items!`);
            }
        } catch (err) {
            showToast('Invalid file!', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// Show toast
function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    
    if (type === 'error') {
        toast.style.background = 'var(--bg-secondary)';
        toast.style.borderLeft = '4px solid #ef4444';
    } else if (type === 'warning') {
        toast.style.background = 'var(--bg-secondary)';
        toast.style.borderLeft = '4px solid #f59e0b';
    } else {
        toast.style.background = 'var(--bg-secondary)';
        toast.style.borderLeft = '4px solid #10b981';
    }
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), type === 'warning' ? 4000 : 3000);
}

// Close modals on escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeExportModal(); }
});

// Close modal on backdrop click
document.getElementById('editModal').addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeModal();
});

document.getElementById('tagsModal').addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeTagsModal();
});

document.getElementById('exportModal').addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeExportModal();
});

// Tags Modal Functions
function openTagsModal() {
    renderTagList();
    document.getElementById('tagsModal').classList.add('show');
}

function closeTagsModal() {
    document.getElementById('tagsModal').classList.remove('show');
    document.getElementById('newTagInput').value = '';
}

function renderTagList() {
    const container = document.getElementById('tagList');
    const untaggedContainer = document.getElementById('untaggedOption');
    
    const tagCounts = {};
    tags.forEach(t => tagCounts[t] = 0);
    items.forEach(item => {
        if (item.tag && tagCounts.hasOwnProperty(item.tag)) {
            tagCounts[item.tag]++;
        }
    });
    
    const untaggedCount = items.filter(i => !i.tag).length;
    
    if (tags.length === 0) {
        container.innerHTML = '<p style="color:#64748b; text-align:center; padding:20px;">No tags created yet.</p>';
    } else {
        container.innerHTML = tags.map(tag => {
            const isChecked = selectedTags.includes(tag);
            return `
            <div class="tag-item">
                <div class="tag-item-left">
                    <span class="tag-item-name">${escapeHtml(tag)}</span>
                    <span class="tag-item-count">${tagCounts[tag]} items</span>
                </div>
                <div class="tag-item-actions">
                    <button class="tag-item-btn ${isChecked ? 'show active' : 'show'}" onclick="toggleTagFilter('${escapeHtml(tag)}')">
                        ${isChecked ? '👁️ Visible' : '👁️‍🗨️ Hidden'}
                    </button>
                    <button class="tag-item-btn delete" onclick="deleteTag('${escapeHtml(tag)}')">🗑️ Delete</button>
                </div>
            </div>
        `}).join('');
    }
    
    const isUntaggedChecked = selectedTags.includes('__untagged__');
    untaggedContainer.innerHTML = `
        <div class="tag-item">
            <div class="tag-item-left">
                <span class="tag-item-name">Untagged</span>
                <span class="tag-item-count">${untaggedCount} items</span>
            </div>
            <div class="tag-item-actions">
                <button class="tag-item-btn ${isUntaggedChecked ? 'show active' : 'show'}" onclick="toggleTagFilter('__untagged__')">
                    ${isUntaggedChecked ? '👁️ Visible' : '👁️‍🗨️ Hidden'}
                </button>
            </div>
        </div>
    `;
}

// Toggle tag visibility in filter
function toggleTagFilter(tag) {
    const index = selectedTags.indexOf(tag);
    if (index > -1) {
        selectedTags.splice(index, 1);
        if (activeFilterTag === tag) {
            activeFilterTag = '__all__';
        }
    } else {
        selectedTags.push(tag);
    }
    saveSelectedTags();
    renderTagList();
    renderTabs();
    render();
}

function addTag() {
    const input = document.getElementById('newTagInput');
    const tagName = input.value.trim();
    
    if (!tagName) {
        showToast('Please enter a tag name!', 'error');
        return;
    }
    
    if (tags.includes(tagName)) {
        showToast('Tag already exists!', 'error');
        return;
    }
    
    tags.push(tagName);
    if (!selectedTags.includes(tagName)) {
        selectedTags.push(tagName);
        saveSelectedTags();
    }
    saveTags();
    populateTagDropdowns();
    renderTagList();
    renderTabs();
    input.value = '';
    showToast('Tag created!');
}

function deleteTag(tagName) {
    if (!confirm(`Delete tag "${tagName}"? Items with this tag will become untagged.`)) return;
    
    items.forEach(item => {
        if (item.tag === tagName) {
            item.tag = null;
        }
    });
    save();
    
    tags = tags.filter(t => t !== tagName);
    saveTags();
    
    if (activeFilterTag === tagName) {
        activeFilterTag = '__all__';
    }
    
    populateTagDropdowns();
    renderTagList();
    render();
    showToast('Tag deleted!');
}

// Handle Enter key in new tag input
document.getElementById('newTagInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') addTag();
});

// Handle Enter key in content input to add item
document.getElementById('contentInput').addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addItem();
    }
});

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Theme toggle
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('copyPasteTheme', newTheme);
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggle');
    if (theme === 'light') {
        btn.textContent = '☀️ Light';
    } else {
        btn.textContent = '🌙 Dark';
    }
}

function initTheme() {
    const saved = localStorage.getItem('copyPasteTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeButton(saved);
}

// Initial setup
initTheme();
initSelectedTags();
populateTagDropdowns();
renderTabs();
render();
