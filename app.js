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
                    <button class="btn btn-share" onclick="shareItem('${item.id}')">🔗 Share</button>
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
    if (e.key === 'Escape') { closeModal(); closeExportModal(); closeShareModal(); closeQRScanner(); }
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
                        ${isChecked ? '👁️ Show' : '👁️‍🗨️ Hide'}
                    </button>
                    <button class="tag-item-btn rename" onclick="renameTag('${escapeHtml(tag)}')" title="Rename">✏️ R</button>
                    <button class="tag-item-btn delete" onclick="deleteTag('${escapeHtml(tag)}')" title="Delete">🗑️ D</button>
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
                    ${isUntaggedChecked ? '👁️ Show' : '👁️‍🗨️ Hide'}
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

function renameTag(oldName) {
    const newName = prompt(`Rename tag "${oldName}" to:`, oldName);
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    
    if (trimmed === oldName) return;
    
    if (tags.includes(trimmed)) {
        showToast('A tag with that name already exists!', 'error');
        return;
    }
    
    // Update tag list
    const idx = tags.indexOf(oldName);
    if (idx > -1) tags[idx] = trimmed;
    saveTags();
    
    // Update all items with this tag
    items.forEach(item => {
        if (item.tag === oldName) item.tag = trimmed;
    });
    save();
    
    // Update selected tags
    const selIdx = selectedTags.indexOf(oldName);
    if (selIdx > -1) selectedTags[selIdx] = trimmed;
    saveSelectedTags();
    
    // Update active filter
    if (activeFilterTag === oldName) activeFilterTag = trimmed;
    
    populateTagDropdowns();
    renderTagList();
    renderTabs();
    render();
    showToast(`Tag renamed to "${trimmed}"!`);
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

// ========== QR Code Generator (Complete, supports up to ~900 bytes) ==========
const QR = (() => {
    // GF(256) with polynomial 0x11d
    const EXP = new Uint8Array(512);
    const LOG = new Uint8Array(256);
    (() => {
        let x = 1;
        for (let i = 0; i < 255; i++) {
            EXP[i] = x;
            LOG[x] = i;
            x = (x << 1) ^ (x & 128 ? 0x11d : 0);
        }
        for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    })();

    function gfMul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }

    function polyMul(a, b) {
        const r = new Uint8Array(a.length + b.length - 1);
        for (let i = 0; i < a.length; i++)
            for (let j = 0; j < b.length; j++)
                r[i + j] ^= gfMul(a[i], b[j]);
        return r;
    }

    function rsEncode(data, ecLen) {
        let gen = new Uint8Array([1]);
        for (let i = 0; i < ecLen; i++)
            gen = polyMul(gen, new Uint8Array([1, EXP[i]]));
        const msg = new Uint8Array(data.length + ecLen);
        msg.set(data);
        for (let i = 0; i < data.length; i++) {
            const coef = msg[i];
            if (coef) for (let j = 0; j < gen.length; j++)
                msg[i + j] ^= gfMul(gen[j], coef);
        }
        return msg.slice(data.length);
    }

    // Version capacities (byte mode, ECC L): [totalCodewords, ecPerBlock, numBlocks, dataPerBlock]
    const VERSIONS = [
        null,
        [26,7,1,19],[44,10,1,34],[70,15,1,55],[100,20,1,80],
        [134,26,1,108],[172,18,2,68],[196,20,2,78],[242,24,2,97],
        [292,30,2,116],[346,18,2,68+1], // v10: 2 blocks, 68+69
        [404,20,4,81],[466,24,4,92],[532,26,4,107],[581,30,3,115+1],
        [655,22,5,87+1],[733,24,5,98],[820,28,5,107+1],[876,30,5,120+1],
        [948,28,3,113+2],[1051,28,3,107+4] // up to v20
    ];

    // Alignment pattern positions by version
    const ALIGN_POS = [
        null,[],
        [6,18],[6,22],[6,26],[6,30],[6,34],
        [6,22,38],[6,24,42],[6,26,46],[6,28,50],
        [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],
        [6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],
        [6,30,58,86],[6,34,62,90]
    ];

    // Data capacity in bytes for each version (ECC L, byte mode)
    const CAPACITY = [0,17,32,53,78,106,134,154,192,230,271,321,367,425,458,520,586,644,718,792,858];

    function getVersion(dataLen) {
        for (let v = 1; v <= 20; v++) {
            if (dataLen <= CAPACITY[v]) return v;
        }
        return 0; // too long
    }

    function makeMatrix(text) {
        const rawData = new TextEncoder().encode(text);
        const version = getVersion(rawData.length);
        if (!version) return null;

        const size = 17 + version * 4;
        const grid = Array.from({length: size}, () => new Int8Array(size)); // 0=light, 1=dark, -1 reserved but light
        const isFunc = Array.from({length: size}, () => new Uint8Array(size)); // 1=function pattern

        // Finder patterns
        function setFinder(r, c) {
            for (let dr = -1; dr <= 7; dr++) {
                for (let dc = -1; dc <= 7; dc++) {
                    const rr = r + dr, cc = c + dc;
                    if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
                    const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
                    const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
                    const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
                    grid[rr][cc] = (inOuter && (onBorder || inInner)) ? 1 : 0;
                    isFunc[rr][cc] = 1;
                }
            }
        }
        setFinder(0, 0);
        setFinder(0, size - 7);
        setFinder(size - 7, 0);

        // Alignment patterns
        if (version >= 2) {
            const positions = ALIGN_POS[version];
            for (let i = 0; i < positions.length; i++) {
                for (let j = 0; j < positions.length; j++) {
                    const r = positions[i], c = positions[j];
                    if (isFunc[r][c]) continue;
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            const dark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
                            grid[r + dr][c + dc] = dark ? 1 : 0;
                            isFunc[r + dr][c + dc] = 1;
                        }
                    }
                }
            }
        }

        // Timing patterns
        for (let i = 8; i < size - 8; i++) {
            const dark = i % 2 === 0 ? 1 : 0;
            grid[6][i] = dark; isFunc[6][i] = 1;
            grid[i][6] = dark; isFunc[i][6] = 1;
        }

        // Dark module + reserved format areas
        grid[size - 8][8] = 1;
        isFunc[size - 8][8] = 1;
        for (let i = 0; i < 9; i++) { isFunc[8][i] = 1; isFunc[i][8] = 1; }
        for (let i = 0; i < 8; i++) { isFunc[8][size - 1 - i] = 1; isFunc[size - 1 - i][8] = 1; }

        // Version info (v >= 7) - mark reserved
        if (version >= 7) {
            for (let i = 0; i < 6; i++) {
                for (let j = 0; j < 3; j++) {
                    isFunc[i][size - 11 + j] = 1;
                    isFunc[size - 11 + j][i] = 1;
                }
            }
        }

        // Encode data
        const vInfo = VERSIONS[version];
        const totalCodewords = vInfo[0];
        const ecPerBlock = vInfo[1];
        const numBlocks = vInfo[2];
        
        // Build data codewords
        const countBits = version <= 9 ? 8 : 16;
        let bitBuf = [];
        // Mode: byte (0100)
        bitBuf.push(0, 1, 0, 0);
        // Count
        for (let i = countBits - 1; i >= 0; i--) bitBuf.push((rawData.length >> i) & 1);
        // Data
        for (let b of rawData) for (let i = 7; i >= 0; i--) bitBuf.push((b >> i) & 1);
        // Terminator
        const dataCodewords = totalCodewords - ecPerBlock * numBlocks;
        const maxBits = dataCodewords * 8;
        for (let i = 0; i < 4 && bitBuf.length < maxBits; i++) bitBuf.push(0);
        while (bitBuf.length % 8) bitBuf.push(0);
        while (bitBuf.length < maxBits) {
            bitBuf.push(1,1,1,0,1,1,0,0); // 0xEC
            if (bitBuf.length < maxBits) bitBuf.push(0,0,0,1,0,0,0,1); // 0x11
        }
        bitBuf = bitBuf.slice(0, maxBits);

        // Convert to bytes
        const dataBytes = new Uint8Array(dataCodewords);
        for (let i = 0; i < dataCodewords; i++) {
            let v = 0;
            for (let b = 0; b < 8; b++) v = (v << 1) | bitBuf[i * 8 + b];
            dataBytes[i] = v;
        }

        // Split into blocks and compute EC
        const blockDataLen = Math.floor(dataCodewords / numBlocks);
        const blocks = [];
        const ecBlocks = [];
        let offset = 0;
        for (let b = 0; b < numBlocks; b++) {
            const len = blockDataLen + (b >= numBlocks - (dataCodewords % numBlocks) && dataCodewords % numBlocks ? 1 : 0);
            const block = dataBytes.slice(offset, offset + len);
            blocks.push(block);
            ecBlocks.push(rsEncode(block, ecPerBlock));
            offset += len;
        }

        // Interleave
        const result = [];
        const maxDataLen = Math.max(...blocks.map(b => b.length));
        for (let i = 0; i < maxDataLen; i++)
            for (let b = 0; b < numBlocks; b++)
                if (i < blocks[b].length) result.push(blocks[b][i]);
        for (let i = 0; i < ecPerBlock; i++)
            for (let b = 0; b < numBlocks; b++)
                result.push(ecBlocks[b][i]);

        // Place data bits
        let bitIdx = 0;
        const totalBits = result.length * 8;
        let goingUp = true;
        for (let col = size - 1; col >= 1; col -= 2) {
            if (col === 6) col = 5;
            for (let cnt = 0; cnt < size; cnt++) {
                const row = goingUp ? size - 1 - cnt : cnt;
                for (let dx = 0; dx <= 1; dx++) {
                    const c = col - dx;
                    if (!isFunc[row][c]) {
                        if (bitIdx < totalBits) {
                            const byteIdx = bitIdx >> 3;
                            const bitPos = 7 - (bitIdx & 7);
                            grid[row][c] = (result[byteIdx] >> bitPos) & 1;
                        }
                        bitIdx++;
                    }
                }
            }
            goingUp = !goingUp;
        }

        // Apply best mask
        let bestMask = 0, bestPenalty = Infinity;
        for (let mask = 0; mask < 8; mask++) {
            const test = grid.map(r => Int8Array.from(r));
            applyMask(test, isFunc, mask, size);
            const pen = calcPenalty(test, size);
            if (pen < bestPenalty) { bestPenalty = pen; bestMask = mask; }
        }
        applyMask(grid, isFunc, bestMask, size);

        // Format info
        const formatVal = getFormatBits(0, bestMask); // ECC L = 01
        for (let i = 0; i < 6; i++) grid[8][i] = (formatVal >> (14 - i)) & 1;
        grid[8][7] = (formatVal >> 8) & 1;
        grid[8][8] = (formatVal >> 7) & 1;
        grid[7][8] = (formatVal >> 6) & 1;
        for (let i = 0; i < 6; i++) grid[5 - i][8] = (formatVal >> (5 - i)) & 1;

        for (let i = 0; i < 8; i++) grid[8][size - 8 + i] = (formatVal >> (14 - i)) & 1;
        for (let i = 0; i < 7; i++) grid[size - 7 + i][8] = (formatVal >> (6 - i)) & 1;

        return grid;
    }

    function applyMask(grid, isFunc, mask, size) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (isFunc[r][c]) continue;
                let invert = false;
                switch (mask) {
                    case 0: invert = (r + c) % 2 === 0; break;
                    case 1: invert = r % 2 === 0; break;
                    case 2: invert = c % 3 === 0; break;
                    case 3: invert = (r + c) % 3 === 0; break;
                    case 4: invert = (Math.floor(r/2) + Math.floor(c/3)) % 2 === 0; break;
                    case 5: invert = (r*c)%2 + (r*c)%3 === 0; break;
                    case 6: invert = ((r*c)%2 + (r*c)%3) % 2 === 0; break;
                    case 7: invert = ((r+c)%2 + (r*c)%3) % 2 === 0; break;
                }
                if (invert) grid[r][c] ^= 1;
            }
        }
    }

    function calcPenalty(grid, size) {
        let penalty = 0;
        // Rule 1: consecutive same-color runs
        for (let r = 0; r < size; r++) {
            let run = 1;
            for (let c = 1; c < size; c++) {
                if (grid[r][c] === grid[r][c-1]) { run++; }
                else { if (run >= 5) penalty += run - 2; run = 1; }
            }
            if (run >= 5) penalty += run - 2;
        }
        for (let c = 0; c < size; c++) {
            let run = 1;
            for (let r = 1; r < size; r++) {
                if (grid[r][c] === grid[r-1][c]) { run++; }
                else { if (run >= 5) penalty += run - 2; run = 1; }
            }
            if (run >= 5) penalty += run - 2;
        }
        // Rule 2: 2x2 blocks
        for (let r = 0; r < size - 1; r++) {
            for (let c = 0; c < size - 1; c++) {
                const v = grid[r][c];
                if (v === grid[r][c+1] && v === grid[r+1][c] && v === grid[r+1][c+1])
                    penalty += 3;
            }
        }
        return penalty;
    }

    // BCH(15,5) for format info
    function getFormatBits(ecl, mask) {
        const data = ((ecl ^ 1) << 3) | mask; // ECC L = 01
        let bits = data << 10;
        let gen = 0x537;
        for (let i = 14; i >= 10; i--) {
            if (bits & (1 << i)) bits ^= gen << (i - 10);
        }
        return ((data << 10) | bits) ^ 0x5412;
    }

    return { makeMatrix, getVersion };
})();

function generateQR(text) {
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');
    const canvasSize = 280;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const matrix = QR.makeMatrix(text);
    if (!matrix) {
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Content too long for QR code.', canvasSize/2, canvasSize/2 - 10);
        ctx.fillText('Use the share link instead.', canvasSize/2, canvasSize/2 + 10);
        document.getElementById('qrFallback').style.display = 'block';
        return;
    }

    document.getElementById('qrFallback').style.display = 'none';
    const modules = matrix.length;
    const cellSize = Math.floor((canvasSize - 16) / modules);
    const offset = Math.floor((canvasSize - cellSize * modules) / 2);

    ctx.fillStyle = '#000000';
    for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
            if (matrix[r][c]) {
                ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
            }
        }
    }
}

// ========== Share Functions ==========
function shareItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Generate shareable link
    const shareData = { label: item.label, content: item.content, tag: item.tag };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
    const shareUrl = window.location.origin + window.location.pathname + '#share=' + encoded;
    
    document.getElementById('shareLink').value = shareUrl;
    document.getElementById('shareLabel').textContent = item.label;
    
    // Generate QR code
    generateQR(shareUrl);
    
    document.getElementById('shareModal').classList.add('show');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('show');
}

function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    navigator.clipboard.writeText(linkInput.value).then(() => {
        showToast('Share link copied!');
    }).catch(() => {
        linkInput.select();
        document.execCommand('copy');
        showToast('Share link copied!');
    });
}

function downloadQR() {
    const canvas = document.getElementById('qrCanvas');
    const link = document.createElement('a');
    link.download = 'snippet-qr.png';
    link.href = canvas.toDataURL();
    link.click();
}

// Handle incoming shared link
function handleSharedLink() {
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return;
    
    try {
        const encoded = hash.substring(7);
        const json = decodeURIComponent(escape(atob(encoded)));
        const shared = JSON.parse(json);
        
        if (!shared.label || !shared.content) {
            showToast('Invalid share link!', 'error');
            return;
        }
        
        // Check if already exists
        const exists = items.some(i => i.content === shared.content && i.label === shared.label);
        if (exists) {
            showToast('This snippet already exists in your collection!', 'warning');
            window.history.replaceState(null, '', window.location.pathname);
            return;
        }
        
        // Import the shared tag if new
        if (shared.tag && !tags.includes(shared.tag)) {
            tags.push(shared.tag);
            if (!selectedTags.includes(shared.tag)) {
                selectedTags.push(shared.tag);
                saveSelectedTags();
            }
            saveTags();
            populateTagDropdowns();
        }
        
        if (confirm(`Import shared snippet "${shared.label}"?`)) {
            items.unshift({
                id: Date.now().toString(),
                label: shared.label,
                content: shared.content,
                tag: shared.tag || null
            });
            save();
            render();
            showToast('Shared snippet imported!');
        }
        
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname);
    } catch (e) {
        showToast('Invalid share link!', 'error');
        window.history.replaceState(null, '', window.location.pathname);
    }
}

// Close share modal on escape and backdrop
document.getElementById('shareModal').addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeShareModal();
});

document.getElementById('qrScannerModal').addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeQRScanner();
});

// ========== QR Scanner ==========
let scannerStream = null;
let scannerInterval = null;

function openQRScanner() {
    document.getElementById('qrScannerModal').classList.add('show');
    switchScannerTab('camera');
}

function closeQRScanner() {
    document.getElementById('qrScannerModal').classList.remove('show');
    stopCameraScanner();
}

function switchScannerTab(tab) {
    const cameraView = document.getElementById('cameraScanView');
    const uploadView = document.getElementById('uploadScanView');
    const pasteView = document.getElementById('pasteScanView');
    const cameraBtn = document.getElementById('cameraTabBtn');
    const uploadBtn = document.getElementById('uploadTabBtn');
    const pasteBtn = document.getElementById('pasteTabBtn');

    cameraView.style.display = 'none';
    uploadView.style.display = 'none';
    pasteView.style.display = 'none';
    cameraBtn.classList.remove('active');
    uploadBtn.classList.remove('active');
    pasteBtn.classList.remove('active');
    stopCameraScanner();

    if (tab === 'camera') {
        cameraView.style.display = '';
        cameraBtn.classList.add('active');
        startCameraScanner();
    } else if (tab === 'upload') {
        uploadView.style.display = '';
        uploadBtn.classList.add('active');
    } else {
        pasteView.style.display = '';
        pasteBtn.classList.add('active');
    }
}

function importFromPastedLink() {
    const input = document.getElementById('pasteShareLink');
    const link = input.value.trim();
    if (!link) {
        showToast('Please paste a share link!', 'error');
        return;
    }
    closeQRScanner();
    processScannedQR(link);
    input.value = '';
}

function startCameraScanner() {
    const video = document.getElementById('qrVideo');
    const status = document.getElementById('scannerStatus');
    status.textContent = 'Starting camera...';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = 'Camera not supported. Use Upload instead.';
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            scannerStream = stream;
            video.srcObject = stream;
            video.play();
            status.textContent = 'Point camera at a QR code...';

            const useBarcodeAPI = 'BarcodeDetector' in window;
            const detector = useBarcodeAPI ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
            const scanCanvas = document.createElement('canvas');
            const scanCtx = scanCanvas.getContext('2d');

            scannerInterval = setInterval(async () => {
                if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

                try {
                    if (detector) {
                        const barcodes = await detector.detect(video);
                        if (barcodes.length > 0) {
                            stopCameraScanner();
                            closeQRScanner();
                            processScannedQR(barcodes[0].rawValue);
                            return;
                        }
                    }
                } catch(e) {}

                // Fallback to manual decoder
                if (!detector) {
                    scanCanvas.width = video.videoWidth;
                    scanCanvas.height = video.videoHeight;
                    scanCtx.drawImage(video, 0, 0);
                    const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
                    const result = decodeQRFromImage(imageData);
                    if (result) {
                        stopCameraScanner();
                        closeQRScanner();
                        processScannedQR(result);
                    }
                }
            }, 400);
        })
        .catch(err => {
            status.textContent = 'Camera access denied. Use Upload instead.';
        });
}

function stopCameraScanner() {
    if (scannerInterval) {
        clearInterval(scannerInterval);
        scannerInterval = null;
    }
    if (scannerStream) {
        scannerStream.getTracks().forEach(t => t.stop());
        scannerStream = null;
    }
    const video = document.getElementById('qrVideo');
    if (video) video.srcObject = null;
}

// ========== QR Scanner (Upload Image) ==========
async function handleQRUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    // Method 1: BarcodeDetector + createImageBitmap (most reliable)
    if ('BarcodeDetector' in window) {
        try {
            const bitmap = await createImageBitmap(file);
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(bitmap);
            if (barcodes.length > 0) {
                closeQRScanner();
                processScannedQR(barcodes[0].rawValue);
                return;
            }
        } catch(err) {}
    }

    // Method 2: Canvas-based manual decoder as fallback
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const result = decodeQRFromImage(imageData);
        if (result) {
            closeQRScanner();
            processScannedQR(result);
        } else {
            showToast('Could not read QR. Try pasting the share link in your browser instead.', 'error');
        }
    };
    img.onerror = () => showToast('Could not load image!', 'error');
    img.src = URL.createObjectURL(file);
}

function processScannedQR(url) {
    // Extract the share hash from the URL
    const hashIdx = url.indexOf('#share=');
    if (hashIdx === -1) {
        showToast('QR does not contain a valid share link!', 'error');
        return;
    }
    
    try {
        const encoded = url.substring(hashIdx + 7);
        const json = decodeURIComponent(escape(atob(encoded)));
        const shared = JSON.parse(json);
        
        if (!shared.label || !shared.content) {
            showToast('Invalid share data in QR!', 'error');
            return;
        }
        
        const exists = items.some(i => i.content === shared.content && i.label === shared.label);
        if (exists) {
            showToast('This snippet already exists!', 'warning');
            return;
        }
        
        if (shared.tag && !tags.includes(shared.tag)) {
            tags.push(shared.tag);
            if (!selectedTags.includes(shared.tag)) {
                selectedTags.push(shared.tag);
                saveSelectedTags();
            }
            saveTags();
            populateTagDropdowns();
        }
        
        if (confirm(`Import snippet "${shared.label}"?`)) {
            items.unshift({
                id: Date.now().toString(),
                label: shared.label,
                content: shared.content,
                tag: shared.tag || null
            });
            save();
            render();
            showToast('Snippet imported from QR!');
        }
    } catch (err) {
        showToast('Could not decode QR data!', 'error');
    }
}

// Lightweight QR decoder from image data
function decodeQRFromImage(imageData) {
    const { data, width, height } = imageData;

    // Convert to grayscale binary matrix
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        gray[i] = data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114;
    }

    // Adaptive threshold (block-based)
    const binary = new Uint8Array(width * height);
    const blockSize = Math.max(15, Math.floor(Math.min(width, height) / 20) | 1);
    const half = blockSize >> 1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, count = 0;
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        sum += gray[ny * width + nx];
                        count++;
                    }
                }
            }
            binary[y * width + x] = gray[y * width + x] < (sum / count - 10) ? 1 : 0;
        }
    }

    // Find finder patterns (3 squares with 1:1:3:1:1 ratio)
    const finders = findFinderPatterns(binary, width, height);
    if (finders.length < 3) return null;

    // Sort finders: top-left, top-right, bottom-left
    finders.sort((a, b) => (a.y + a.x) - (b.y + b.x));
    const topLeft = finders[0];
    let topRight, bottomLeft;
    
    if (finders.length >= 3) {
        const others = finders.slice(1);
        others.sort((a, b) => a.y - b.y);
        if (others[0].x > others[1].x) {
            topRight = others[0];
            bottomLeft = others[1];
        } else {
            topRight = others[0].y < others[1].y ? others[0] : others[1];
            bottomLeft = others[0].y < others[1].y ? others[1] : others[0];
        }
        // Re-determine: topRight has larger x, bottomLeft has larger y
        if (topRight.y > bottomLeft.y) {
            [topRight, bottomLeft] = [bottomLeft, topRight];
        }
        if (topRight.x < topLeft.x) {
            [topRight, bottomLeft] = [bottomLeft, topRight];
        }
    }

    // Estimate module size
    const dist = Math.sqrt((topRight.x - topLeft.x) ** 2 + (topRight.y - topLeft.y) ** 2);
    const moduleSize = dist / (topRight.moduleCount || (dist / (topLeft.size / 7)));
    const estModules = Math.round(dist / moduleSize) + 7;
    const version = Math.round((estModules - 17) / 4);
    if (version < 1 || version > 20) return null;
    const size = 17 + version * 4;
    const cellSize = dist / (size - 7);

    // Sample the grid
    const grid = [];
    // Calculate transform from finder positions
    const startX = topLeft.x - 3.5 * cellSize;
    const startY = topLeft.y - 3.5 * cellSize;
    const angleX = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
    const cosA = Math.cos(angleX), sinA = Math.sin(angleX);

    for (let r = 0; r < size; r++) {
        grid[r] = [];
        for (let c = 0; c < size; c++) {
            const px = startX + (c + 0.5) * cellSize * cosA - (r + 0.5) * cellSize * sinA;
            const py = startY + (c + 0.5) * cellSize * sinA + (r + 0.5) * cellSize * cosA;
            const ix = Math.round(px), iy = Math.round(py);
            if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
                grid[r][c] = binary[iy * width + ix];
            } else {
                grid[r][c] = 0;
            }
        }
    }

    // Read format info
    let formatBits = 0;
    for (let i = 0; i < 6; i++) formatBits = (formatBits << 1) | grid[8][i];
    formatBits = (formatBits << 1) | grid[8][7];
    formatBits = (formatBits << 1) | grid[8][8];
    formatBits = (formatBits << 1) | grid[7][8];
    for (let i = 5; i >= 0; i--) formatBits = (formatBits << 1) | grid[i][8];

    formatBits ^= 0x5412;
    const maskPattern = formatBits & 7;

    // Unmask
    const isFunction = buildFunctionPattern(size, version);
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (isFunction[r][c]) continue;
            let invert = false;
            switch (maskPattern) {
                case 0: invert = (r + c) % 2 === 0; break;
                case 1: invert = r % 2 === 0; break;
                case 2: invert = c % 3 === 0; break;
                case 3: invert = (r + c) % 3 === 0; break;
                case 4: invert = (Math.floor(r/2) + Math.floor(c/3)) % 2 === 0; break;
                case 5: invert = (r*c)%2 + (r*c)%3 === 0; break;
                case 6: invert = ((r*c)%2 + (r*c)%3) % 2 === 0; break;
                case 7: invert = ((r+c)%2 + (r*c)%3) % 2 === 0; break;
            }
            if (invert) grid[r][c] ^= 1;
        }
    }

    // Read data bits
    const dataBits = [];
    let goingUp = true;
    for (let col = size - 1; col >= 1; col -= 2) {
        if (col === 6) col = 5;
        for (let cnt = 0; cnt < size; cnt++) {
            const row = goingUp ? size - 1 - cnt : cnt;
            for (let dx = 0; dx <= 1; dx++) {
                const c = col - dx;
                if (!isFunction[row][c]) {
                    dataBits.push(grid[row][c]);
                }
            }
        }
        goingUp = !goingUp;
    }

    // Parse: mode(4) + count + data
    let pos = 0;
    const mode = (dataBits[0] << 3) | (dataBits[1] << 2) | (dataBits[2] << 1) | dataBits[3];
    pos = 4;
    if (mode !== 4) return null; // Only byte mode supported

    const countBits = version <= 9 ? 8 : 16;
    let charCount = 0;
    for (let i = 0; i < countBits; i++) {
        charCount = (charCount << 1) | dataBits[pos++];
    }

    const bytes = [];
    for (let i = 0; i < charCount; i++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) {
            byte = (byte << 1) | (dataBits[pos++] || 0);
        }
        bytes.push(byte);
    }

    return new TextDecoder().decode(new Uint8Array(bytes));
}

function findFinderPatterns(binary, width, height) {
    const candidates = [];
    // Scan horizontal lines for 1:1:3:1:1 dark:light:dark:light:dark pattern
    for (let y = 0; y < height; y += 2) {
        let counts = [0,0,0,0,0];
        let state = 0;
        for (let x = 0; x < width; x++) {
            const pixel = binary[y * width + x];
            if (pixel === 1) { // dark
                if (state === 1 || state === 3) { state++; counts[state] = 1; }
                else counts[state]++;
            } else { // light
                if (state === 0 || state === 2) { state++; counts[state] = 1; }
                else if (state === 4) {
                    // Check ratio 1:1:3:1:1
                    if (isFinderRatio(counts)) {
                        const totalWidth = counts.reduce((a,b) => a+b);
                        const cx = x - totalWidth / 2;
                        const moduleSize = totalWidth / 7;
                        // Verify vertical
                        if (checkVertical(binary, width, height, Math.round(cx), y, moduleSize)) {
                            candidates.push({ x: Math.round(cx), y, size: totalWidth, moduleCount: 7 });
                        }
                    }
                    counts = [counts[2], counts[3], counts[4], 1, 0];
                    state = 3;
                } else {
                    counts[state]++;
                }
            }
        }
    }

    // Deduplicate nearby candidates
    const merged = [];
    for (const c of candidates) {
        let found = false;
        for (const m of merged) {
            if (Math.abs(m.x - c.x) < c.size/2 && Math.abs(m.y - c.y) < c.size/2) {
                m.x = (m.x + c.x) / 2;
                m.y = (m.y + c.y) / 2;
                found = true;
                break;
            }
        }
        if (!found) merged.push({...c});
    }
    return merged.slice(0, 3);
}

function isFinderRatio(counts) {
    const total = counts.reduce((a,b) => a+b);
    if (total < 7) return false;
    const module = total / 7;
    const threshold = module * 0.7;
    return Math.abs(counts[0] - module) < threshold &&
           Math.abs(counts[1] - module) < threshold &&
           Math.abs(counts[2] - module * 3) < threshold * 3 &&
           Math.abs(counts[3] - module) < threshold &&
           Math.abs(counts[4] - module) < threshold;
}

function checkVertical(binary, width, height, cx, cy, moduleSize) {
    const maxRange = Math.round(moduleSize * 5);
    let darkCount = 0;
    for (let dy = -maxRange; dy <= maxRange; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= height) continue;
        if (binary[y * width + cx] === 1) darkCount++;
    }
    return darkCount > maxRange * 0.3;
}

function buildFunctionPattern(size, version) {
    const isFunc = Array.from({length: size}, () => new Uint8Array(size));

    // Finders + separators
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            isFunc[i][j] = 1;
            isFunc[i][size - 1 - j] = 1;
            isFunc[size - 1 - i][j] = 1;
        }
    }
    // Timing
    for (let i = 8; i < size - 8; i++) {
        isFunc[6][i] = 1;
        isFunc[i][6] = 1;
    }
    // Format info
    for (let i = 0; i < 9; i++) { isFunc[8][i] = 1; isFunc[i][8] = 1; }
    for (let i = 0; i < 8; i++) { isFunc[8][size-1-i] = 1; isFunc[size-1-i][8] = 1; }

    // Alignment patterns
    const ALIGN_POS = [
        null,[],
        [6,18],[6,22],[6,26],[6,30],[6,34],
        [6,22,38],[6,24,42],[6,26,46],[6,28,50],
        [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],
        [6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],
        [6,30,58,86],[6,34,62,90]
    ];
    if (version >= 2) {
        const positions = ALIGN_POS[version];
        for (const r of positions) {
            for (const c of positions) {
                if (isFunc[r] && isFunc[r][c]) continue;
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const rr = r+dr, cc = c+dc;
                        if (rr >= 0 && rr < size && cc >= 0 && cc < size)
                            isFunc[rr][cc] = 1;
                    }
                }
            }
        }
    }
    // Version info
    if (version >= 7) {
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 3; j++) {
                isFunc[i][size-11+j] = 1;
                isFunc[size-11+j][i] = 1;
            }
        }
    }
    // Dark module
    isFunc[size - 8][8] = 1;
    return isFunc;
}

// Initial setup
initTheme();
initSelectedTags();
populateTagDropdowns();
renderTabs();
render();
handleSharedLink();
