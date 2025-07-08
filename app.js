// Enhanced SIWES Tracker with IndexedDB Storage
// IndexedDB Database Manager
class SIWESDatabase {
  constructor() {
    this.dbName = 'SIWESTracker';
    this.version = 1;
    this.db = null;
    this.storeName = 'entries';
  }

  // Initialize database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('Database failed to open');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // Create indexes
          objectStore.createIndex('date', 'date', { unique: false });
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
          
          console.log('Object store created');
        }
      };
    });
  }

  // Add new entry
  async addEntry(entryData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      
      const request = objectStore.add({
        ...entryData,
        createdAt: new Date().toISOString()
      });
      
      request.onsuccess = () => {
        console.log('Entry added successfully');
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Error adding entry');
        reject(request.error);
      };
    });
  }

  // Get all entries
  async getAllEntries() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();
      
      request.onsuccess = () => {
        // Sort by creation date (newest first)
        const entries = request.result.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        resolve(entries);
      };
      
      request.onerror = () => {
        console.error('Error getting entries');
        reject(request.error);
      };
    });
  }

  // Update entry
  async updateEntry(id, updatedData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      
      // First get the existing entry
      const getRequest = objectStore.get(id);
      
      getRequest.onsuccess = () => {
        const existingEntry = getRequest.result;
        if (existingEntry) {
          const updatedEntry = {
            ...existingEntry,
            ...updatedData,
            updatedAt: new Date().toISOString()
          };
          
          const putRequest = objectStore.put(updatedEntry);
          
          putRequest.onsuccess = () => {
            console.log('Entry updated successfully');
            resolve(putRequest.result);
          };
          
          putRequest.onerror = () => {
            console.error('Error updating entry');
            reject(putRequest.error);
          };
        } else {
          reject(new Error('Entry not found'));
        }
      };
      
      getRequest.onerror = () => {
        console.error('Error getting entry for update');
        reject(getRequest.error);
      };
    });
  }

  // Delete entry
  async deleteEntry(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(id);
      
      request.onsuccess = () => {
        console.log('Entry deleted successfully');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Error deleting entry');
        reject(request.error);
      };
    });
  }

  // Get entry by ID
  async getEntry(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(id);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Error getting entry');
        reject(request.error);
      };
    });
  }

  // Clear all entries
  async clearAllEntries() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();
      
      request.onsuccess = () => {
        console.log('All entries cleared');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Error clearing entries');
        reject(request.error);
      };
    });
  }

  // Get storage usage estimate
  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return { usage: 0, quota: 0 };
  }

  // Export all data
  async exportData() {
    const entries = await this.getAllEntries();
    return entries;
  }

  // Import data (clear existing and add new)
  async importData(entries) {
    await this.clearAllEntries();
    
    for (const entry of entries) {
      // Remove id to let IndexedDB auto-generate new ones
      const { id, ...entryData } = entry;
      await this.addEntry(entryData);
    }
  }
}

//-------------------------------------------------------------------------------------------------------------------//
// Image compression utility 
const ImageCompressor = {
  compressImage: function(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = this.calculateDimensions(img.width, img.height, maxWidth, maxHeight);
          
          // Set canvas size
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with compression
          canvas.toBlob((blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onload = () => resolve({
                dataUrl: reader.result,
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(1),
                fileName: file.name
              });
              reader.readAsDataURL(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', quality);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  },
  
  calculateDimensions: function(originalWidth, originalHeight, maxWidth, maxHeight) {
    let width = originalWidth;
    let height = originalHeight;
    
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);
    
    if (ratio < 1) {
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    return { width, height };
  }
};

//-----------------------------------------------------------------------------------------------------------------------//
// Main application class
class SIWESTracker {
  constructor() {
    this.db = new SIWESDatabase();
    this.entries = [];
    this.editingEntry = null;
    this.imageURLs = [];
    this.fileNames = [];
    this.editImageURLs = [];
    this.compressionSettings = {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8
    };
    
    this.init();
  }

  async init() {
    try {
      // Show loading indicator
      this.showLoadingIndicator(true);
      
      // Initialize database
      await this.db.init();
      
      // Initialize UI elements
      this.initializeElements();
      this.setupEventListeners();
      
      // Load existing entries
      await this.loadAllEntries();
      
      console.log('SIWES Tracker initialized successfully');
    } catch (error) {
      console.error('Error initializing SIWES Tracker:', error);
      alert('Error initializing application. Please refresh the page.');
    } finally {
      this.showLoadingIndicator(false);
    }
  }

  initializeElements() {
    // Form elements
    this.form = document.querySelector(".entry-form");
    this.editForm = document.querySelector(".edit-form");
    this.entriesContainer = document.getElementById("entries-container");
    
    // Modal elements
    this.modal = document.getElementById("entry-modal");
    this.editModal = document.getElementById("edit-modal");
    this.openBtn = document.getElementById("open-modal-btn");
    this.closeBtn = document.querySelector(".close-btn");
    this.closeEdit = document.querySelector(".close");
    
    // Image elements
    this.imageInput = document.getElementById("entry-image");
    this.previewList = document.getElementById("entry-preview-list");
    this.editImageInput = document.getElementById("edit-image");
    this.editPreviewList = document.getElementById("edit-preview-list");
    
    // Sidebar elements
    this.toggleBtn = document.getElementById("toggle-btn");
    this.sidebar = document.getElementById("sidebar");
    
    // Create loading indicator if it doesn't exist
    if (!document.getElementById("loading-indicator")) {
      this.createLoadingIndicator();
    }
  }

  createLoadingIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "loading-indicator";
    indicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 10000;
      display: none;
    `;
    indicator.innerHTML = '<div>Loading...</div>';
    document.body.appendChild(indicator);
  }

  showLoadingIndicator(show) {
    const indicator = document.getElementById("loading-indicator");
    if (indicator) {
      indicator.style.display = show ? "block" : "none";
    }
  }

  setupEventListeners() {
    // Modal controls
    this.openBtn.onclick = () => this.openModal();
    this.closeBtn.onclick = () => this.closeModal();
    this.closeEdit.onclick = () => this.closeEditModal();
    
    // Close modals on outside click
    window.onclick = (e) => {
      if (e.target === this.modal) this.closeModal();
      if (e.target === this.editModal) this.closeEditModal();
    };

    // Form submissions
    this.form.addEventListener("submit", (e) => this.handleAddEntry(e));
    this.editForm.addEventListener("submit", (e) => this.handleEditEntry(e));
    
    // Image handling
    this.imageInput.addEventListener("change", (e) => this.handleImageSelection(e));
    this.editImageInput.addEventListener("change", (e) => this.handleEditImageSelection(e));
    
    // Sidebar toggle
    this.toggleBtn.addEventListener("click", () => this.toggleSidebar());
  }

  // Load all entries from IndexedDB
  async loadAllEntries() {
    try {
      this.entries = await this.db.getAllEntries();
      this.displayAllEntries();
      await this.updateStorageDisplay();
      console.log(`Loaded ${this.entries.length} entries from IndexedDB`);
    } catch (error) {
      console.error('Error loading entries:', error);
      alert('Error loading entries from database');
    }
  }

  // Display all entries
  displayAllEntries() {
    this.entriesContainer.innerHTML = '';
    
    if (this.entries.length === 0) {
      this.entriesContainer.innerHTML = '<p style="text-align: center; color: #666;">No entries yet. Add your first entry!</p>';
      return;
    }
    
    this.entries.forEach((entry) => {
      this.createEntryCard(entry);
    });
  }

  // Create entry card
  createEntryCard(entry) {
    const entryCard = document.createElement("div");
    entryCard.classList.add("entry-card");
    entryCard.dataset.id = entry.id;

    entryCard.innerHTML = `
      <div class="entry-header">
        <h3>${entry.date}</h3> 
      </div>
      ${entry.images && entry.images.length > 0 ? `
        <div class="images-container">
          ${entry.images.map(url => `<img src="${url}" class="entry-image" alt="Entry image" onclick="tracker.viewImage('${url}')">`).join('')}
        </div>
      ` : ''}
      <p class="entry-description">${entry.description}</p>
      <div class="entry-meta">
        <small>Created: ${new Date(entry.createdAt).toLocaleDateString()}</small>
        ${entry.updatedAt ? `<small>Updated: ${new Date(entry.updatedAt).toLocaleDateString()}</small>` : ''}
      </div>
      <div class="entry-actions">
          <button class="edit-btn" onclick="tracker.editEntry(${entry.id})">Edit</button>
          <button class="delete-btn" onclick="tracker.deleteEntry(${entry.id})">Delete</button>
        </div>
    `;

    this.entriesContainer.appendChild(entryCard);
  }

  // Handle adding new entry
  async handleAddEntry(e) {
    e.preventDefault();
    
    const date = document.getElementById("entry-date").value;
    const description = document.getElementById("entry-description").value;

    if (!date || !description) {
      alert('Please fill in all required fields');
      return;
    }

    // Show loading
    const submitBtn = this.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    try {
      const newEntry = {
        date: date,
        description: description,
        images: [...this.imageURLs]
      };

      // Add to database
      const id = await this.db.addEntry(newEntry);
      
      // Reload entries to get the new one with ID
      await this.loadAllEntries();
      
      // Reset form and close modal
      this.resetAddForm();
      this.closeModal();
      
      console.log('New entry added successfully with ID:', id);
      
      // Show success message
      this.showToast('Entry added successfully!');
      
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Error adding entry. Please try again.');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  // Handle editing entry
  async handleEditEntry(e) {
    e.preventDefault();
    
    if (!this.editingEntry) return;

    const newDate = document.getElementById("edit-date").value;
    const newDescription = document.getElementById("edit-description").value;

    if (!newDate || !newDescription) {
      alert('Please fill in all required fields');
      return;
    }

    // Show loading
    const submitBtn = this.editForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;

    try {
      const updatedData = {
        date: newDate,
        description: newDescription,
        images: [...this.editImageURLs]
      };

      // Update in database
      await this.db.updateEntry(this.editingEntry.id, updatedData);
      
      // Reload entries
      await this.loadAllEntries();
      
      // Reset and close
      this.resetEditForm();
      this.closeEditModal();
      
      console.log('Entry updated successfully');
      this.showToast('Entry updated successfully!');
      
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Error updating entry. Please try again.');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  // Delete entry
  async deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await this.db.deleteEntry(id);
      await this.loadAllEntries();
      console.log('Entry deleted successfully');
      this.showToast('Entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry. Please try again.');
    }
  }

  // Edit entry
  async editEntry(id) {
    try {
      this.editingEntry = await this.db.getEntry(id);
      
      if (!this.editingEntry) {
        alert('Entry not found');
        return;
      }
      
      // Populate edit form
      document.getElementById("edit-date").value = this.editingEntry.date;
      document.getElementById("edit-description").value = this.editingEntry.description;
      
      // Handle images
      this.editImageURLs = this.editingEntry.images ? [...this.editingEntry.images] : [];
      this.updateEditImagePreview();
      
      // Show edit modal
      this.editModal.style.display = "block";
      
    } catch (error) {
      console.error('Error loading entry for editing:', error);
      alert('Error loading entry for editing');
    }
  }

  // Handle image selection with compression
  async handleImageSelection(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    this.showImageProcessingIndicator(true);
    
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file.`);
          continue;
        }
        
        console.log(`Processing ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
        
        const compressed = await ImageCompressor.compressImage(
          file, 
          this.compressionSettings.maxWidth, 
          this.compressionSettings.maxHeight, 
          this.compressionSettings.quality
        );
        
        console.log(`Compressed ${file.name}: ${compressed.compressionRatio}% reduction`);
        
        this.imageURLs.push(compressed.dataUrl);
        this.fileNames.push(`${compressed.fileName} (compressed)`);
      }
      
      this.updateImagePreview();
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images. Please try again.');
    } finally {
      this.showImageProcessingIndicator(false);
    }
  }

  // Handle edit image selection
  async handleEditImageSelection(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    this.showImageProcessingIndicator(true, 'edit');
    
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file.`);
          continue;
        }
        
        const compressed = await ImageCompressor.compressImage(
          file, 
          this.compressionSettings.maxWidth, 
          this.compressionSettings.maxHeight, 
          this.compressionSettings.quality
        );
        
        this.editImageURLs.push(compressed.dataUrl);
      }
      
      this.updateEditImagePreview();
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images. Please try again.');
    } finally {
      this.showImageProcessingIndicator(false, 'edit');
    }
  }

  // Show image processing indicator
  showImageProcessingIndicator(show, context = 'add') {
    const targetInput = context === 'edit' ? this.editImageInput : this.imageInput;
    
    if (show) {
      targetInput.disabled = true;
      console.log('Processing images...');
    } else {
      setTimeout(() => {
        targetInput.disabled = false;
        targetInput.value = '';
      }, 100);
    }
  }

  // Update image preview
  updateImagePreview() {
    this.previewList.innerHTML = '';
    this.fileNames.forEach((name, index) => {
      const item = document.createElement("div");
      item.classList.add("file-preview-item");
      item.innerHTML = `<span>${name}</span><span style="color: red; cursor: pointer;">&times;</span>`;
      
      item.addEventListener("click", () => {
        this.imageURLs.splice(index, 1);
        this.fileNames.splice(index, 1);
        this.updateImagePreview();
      });
      
      this.previewList.appendChild(item);
    });
  }

  // Update edit image preview
  updateEditImagePreview() {
    this.editPreviewList.innerHTML = '';
    this.editImageURLs.forEach((url, index) => {
      const item = document.createElement("div");
      item.classList.add("file-preview-item");
      item.innerHTML = `<span>Image ${index + 1}</span><span style="color:red; cursor: pointer;">&times;</span>`;
      
      item.addEventListener("click", () => {
        this.editImageURLs.splice(index, 1);
        this.updateEditImagePreview();
      });
      
      this.editPreviewList.appendChild(item);
    });
  }

  // View image in modal/full size
  viewImage(url) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    `;
    
    modal.appendChild(img);
    modal.onclick = () => document.body.removeChild(modal);
    document.body.appendChild(modal);
  }

  // Modal controls
  openModal() {
    this.modal.style.display = "block";
  }

  closeModal() {
    this.modal.style.display = "none";
    this.resetAddForm();
  }

  closeEditModal() {
    this.editModal.style.display = "none";
    this.resetEditForm();
  }

  // Reset forms
  resetAddForm() {
    this.form.reset();
    this.imageURLs = [];
    this.fileNames = [];
    this.previewList.innerHTML = "";
  }

  resetEditForm() {
    this.editForm.reset();
    this.editImageURLs = [];
    this.editPreviewList.innerHTML = "";
    this.editingEntry = null;
  }

  // Sidebar toggle
  toggleSidebar() {
    this.sidebar.classList.toggle("collapsed");
  }

  // Show toast notification
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 10000;
      font-size: 14px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, duration);
  }

  // Update storage display
  async updateStorageDisplay() {
    try {
      const estimate = await this.db.getStorageEstimate();
      const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
      
      console.log(`Storage: ${usedMB} MB used of ${quotaMB} MB available`);
    } catch (error) {
      console.error('Error getting storage estimate:', error);
    }
  }

  // Export data
  async exportData() {
    try {
      const entries = await this.db.exportData();
      const dataStr = JSON.stringify(entries, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `siwes_entries_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      this.showToast(`Exported ${entries.length} entries successfully!`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data');
    }
  }

  // Import data
  async importData(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedEntries = JSON.parse(e.target.result);
        if (Array.isArray(importedEntries)) {
          if (confirm(`Import ${importedEntries.length} entries? This will replace current data.`)) {
            this.showLoadingIndicator(true);
            await this.db.importData(importedEntries);
            await this.loadAllEntries();
            this.showToast('Data imported successfully!');
          }
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        alert('Error importing data. Please check the file format.');
        console.error('Import error:', error);
      } finally {
        this.showLoadingIndicator(false);
      }
    };
    reader.readAsText(file);
  }

  // Clear all data
  async clearAllData() {
    if (confirm('Are you sure you want to delete ALL entries? This cannot be undone.')) {
      try {
        this.showLoadingIndicator(true);
        await this.db.clearAllEntries();
        await this.loadAllEntries();
        this.showToast('All data cleared successfully!');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data');
      } finally {
        this.showLoadingIndicator(false);
      }
    }
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const estimate = await this.db.getStorageEstimate();
      const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
      const percentUsed = estimate.quota > 0 ? ((estimate.usage / estimate.quota) * 100).toFixed(1) : 'Unknown';
      
      alert(
        `Storage Statistics:\n` +
        `Used: ${usedMB} MB (${percentUsed}%)\n` +
        `Available: ${quotaMB} MB\n` +
        `Total entries: ${this.entries.length}`
      );
    } catch (error) {
      console.error('Error getting storage stats:', error);
      alert('Error getting storage statistics');
    }
  }
}

// Initialize the app
let tracker;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Check for IndexedDB support
  if (!window.indexedDB) {
    alert('Your browser does not support IndexedDB. Please use a modern browser.');
    return;
  }

  // Initialize tracker
  tracker = new SIWESTracker();
  
  // Create file input for imports
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json';
  importInput.style.display = 'none';
  importInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      tracker.importData(e.target.files[0]);
    }
  });
  document.body.appendChild(importInput);
  
  // Make functions available globally
  window.exportData = () => tracker.exportData();
  window.importData = () => importInput.click();
  window.clearAllData = () => tracker.clearAllData();
  window.getStorageStats = () => tracker.getStorageStats();
  
  console.log('Enhanced SIWES Tracker with IndexedDB loaded successfully!');
  console.log('Features:');
  console.log('✓ IndexedDB storage (much larger capacity)');
  console.log('✓ Image compression');
  console.log('✓ Better performance');
  console.log('✓ Offline support');
  console.log('Available commands: exportData(), importData(), clearAllData(), getStorageStats()');
});