/**
 * Page overlay script that gets injected into the tested page
 * This provides interactive element selection and recording capabilities
 */

export const getOverlayScript = () => {
  return `
    (function() {
      // Prevent multiple injections
      if (window.__testAutomationOverlay) return;
      window.__testAutomationOverlay = true;

      // Styles for the overlay
      const styles = \`
        .ta-overlay {
          position: fixed;
          top: 0;
          right: 0;
          width: 350px;
          height: 100vh;
          background: white;
          box-shadow: -2px 0 10px rgba(0,0,0,0.1);
          z-index: 999999;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .ta-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ta-title {
          font-size: 16px;
          font-weight: 600;
        }

        .ta-minimize {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }

        .ta-minimize:hover {
          background: rgba(255,255,255,0.3);
        }

        .ta-controls {
          padding: 15px;
          border-bottom: 1px solid #e5e7eb;
        }

        .ta-button {
          width: 100%;
          padding: 8px 12px;
          margin: 5px 0;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .ta-button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .ta-button.active {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .ta-button.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .ta-elements {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .ta-element-item {
          padding: 10px;
          margin: 8px 0;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ta-element-item:hover {
          background: #f9fafb;
          border-color: #3b82f6;
        }

        .ta-element-name {
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .ta-element-selector {
          font-size: 12px;
          color: #6b7280;
          font-family: 'Monaco', 'Menlo', monospace;
          word-break: break-all;
        }

        .ta-highlight {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
          background-color: rgba(59, 130, 246, 0.1) !important;
        }

        .ta-selected {
          outline: 2px solid #10b981 !important;
          outline-offset: 2px !important;
          background-color: rgba(16, 185, 129, 0.1) !important;
        }

        .ta-tooltip {
          position: absolute;
          background: #1f2937;
          color: white;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
          pointer-events: none;
          z-index: 999998;
          white-space: nowrap;
        }

        .ta-minimized {
          width: 60px;
        }

        .ta-minimized .ta-controls,
        .ta-minimized .ta-elements,
        .ta-minimized .ta-title {
          display: none;
        }

        .ta-status {
          padding: 10px 15px;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          margin: 10px 15px;
          font-size: 13px;
          color: #92400e;
        }

        .ta-input-group {
          margin: 10px 0;
        }

        .ta-input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
        }

        .ta-label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
      \`;

      // Inject styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);

      // Create overlay container
      const overlay = document.createElement('div');
      overlay.className = 'ta-overlay';
      overlay.innerHTML = \`
        <div class="ta-header">
          <div class="ta-title">🎯 Test Automation</div>
          <button class="ta-minimize">_</button>
        </div>
        <div class="ta-controls">
          <button class="ta-button" id="ta-inspect">
            🔍 Inspect Mode
          </button>
          <button class="ta-button" id="ta-record">
            ⏺️ Start Recording
          </button>
          <button class="ta-button primary" id="ta-select">
            👆 Select Element
          </button>
          <div class="ta-input-group">
            <label class="ta-label">Element Name:</label>
            <input type="text" class="ta-input" id="ta-element-name" placeholder="e.g., loginButton">
          </div>
        </div>
        <div class="ta-status" id="ta-status" style="display: none;"></div>
        <div class="ta-elements">
          <div style="color: #6b7280; font-size: 13px; text-align: center; padding: 20px;">
            No elements mapped yet.<br>
            Click "Select Element" to start.
          </div>
        </div>
      \`;
      document.body.appendChild(overlay);

      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'ta-tooltip';
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);

      // State
      let inspectMode = false;
      let selectMode = false;
      let recording = false;
      let hoveredElement = null;
      let selectedElement = null;
      let mappedElements = [];

      // Helper functions
      function getSelector(element) {
        if (element.id) return \`#\${element.id}\`;
        
        const dataTestId = element.getAttribute('data-testid') || 
                          element.getAttribute('data-test') || 
                          element.getAttribute('data-cy');
        if (dataTestId) return \`[data-testid="\${dataTestId}"]\`;
        
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c.length > 0);
          if (classes.length > 0) {
            return \`.\${classes.join('.')}\`;
          }
        }
        
        return element.tagName.toLowerCase();
      }

      function showStatus(message, duration = 3000) {
        const status = document.getElementById('ta-status');
        status.textContent = message;
        status.style.display = 'block';
        setTimeout(() => {
          status.style.display = 'none';
        }, duration);
      }

      function updateElementsList() {
        const container = document.querySelector('.ta-elements');
        if (mappedElements.length === 0) {
          container.innerHTML = \`
            <div style="color: #6b7280; font-size: 13px; text-align: center; padding: 20px;">
              No elements mapped yet.<br>
              Click "Select Element" to start.
            </div>
          \`;
          return;
        }

        container.innerHTML = mappedElements.map(el => \`
          <div class="ta-element-item" data-selector="\${el.selector}">
            <div class="ta-element-name">\${el.name}</div>
            <div class="ta-element-selector">\${el.selector}</div>
          </div>
        \`).join('');
      }

      function highlightElement(element) {
        if (hoveredElement && hoveredElement !== element) {
          hoveredElement.classList.remove('ta-highlight');
        }
        element.classList.add('ta-highlight');
        hoveredElement = element;
      }

      function unhighlightElement(element) {
        element.classList.remove('ta-highlight');
        if (hoveredElement === element) {
          hoveredElement = null;
        }
      }

      function selectElement(element) {
        if (selectedElement) {
          selectedElement.classList.remove('ta-selected');
        }
        element.classList.add('ta-selected');
        selectedElement = element;
        
        const selector = getSelector(element);
        document.getElementById('ta-element-name').focus();
        showStatus(\`Selected: \${selector}\`);
      }

      // Event handlers
      document.getElementById('ta-inspect').addEventListener('click', function() {
        inspectMode = !inspectMode;
        this.classList.toggle('active');
        selectMode = false;
        document.getElementById('ta-select').classList.remove('active');
        
        if (inspectMode) {
          showStatus('Inspect mode ON - Hover over elements');
        } else {
          showStatus('Inspect mode OFF');
          if (hoveredElement) {
            unhighlightElement(hoveredElement);
          }
        }
      });

      document.getElementById('ta-select').addEventListener('click', function() {
        selectMode = !selectMode;
        this.classList.toggle('active');
        inspectMode = false;
        document.getElementById('ta-inspect').classList.remove('active');
        
        if (selectMode) {
          showStatus('Click on an element to select it');
        } else {
          showStatus('Select mode OFF');
        }
      });

      document.getElementById('ta-record').addEventListener('click', function() {
        recording = !recording;
        this.classList.toggle('active');
        this.innerHTML = recording ? '⏹️ Stop Recording' : '⏺️ Start Recording';
        
        if (recording) {
          showStatus('Recording started - Your actions are being captured');
          window.postMessage({ type: 'ta-recording-started' }, '*');
        } else {
          showStatus('Recording stopped');
          window.postMessage({ type: 'ta-recording-stopped' }, '*');
        }
      });

      document.querySelector('.ta-minimize').addEventListener('click', function() {
        overlay.classList.toggle('ta-minimized');
        this.textContent = overlay.classList.contains('ta-minimized') ? '□' : '_';
      });

      document.getElementById('ta-element-name').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && selectedElement) {
          const name = this.value.trim();
          if (name) {
            const selector = getSelector(selectedElement);
            mappedElements.push({ name, selector, element: selectedElement });
            updateElementsList();
            
            // Send to backend
            window.postMessage({
              type: 'ta-element-mapped',
              data: { name, selector }
            }, '*');
            
            selectedElement.classList.remove('ta-selected');
            selectedElement = null;
            this.value = '';
            showStatus(\`Mapped: \${name}\`);
          }
        }
      });

      // Global mouse events
      document.addEventListener('mouseover', function(e) {
        if (!inspectMode || e.target.closest('.ta-overlay')) return;
        
        const element = e.target;
        highlightElement(element);
        
        // Show tooltip
        const rect = element.getBoundingClientRect();
        tooltip.textContent = getSelector(element);
        tooltip.style.display = 'block';
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - 30) + 'px';
      });

      document.addEventListener('mouseout', function(e) {
        if (!inspectMode || e.target.closest('.ta-overlay')) return;
        
        unhighlightElement(e.target);
        tooltip.style.display = 'none';
      });

      document.addEventListener('click', function(e) {
        // Ignore clicks on overlay
        if (e.target.closest('.ta-overlay')) return;
        
        if (selectMode) {
          e.preventDefault();
          e.stopPropagation();
          selectElement(e.target);
          return false;
        }
        
        if (recording) {
          const selector = getSelector(e.target);
          window.postMessage({
            type: 'ta-action-recorded',
            data: {
              action: 'click',
              selector: selector,
              timestamp: Date.now()
            }
          }, '*');
        }
      }, true);

      // Listen for messages from parent
      window.addEventListener('message', function(e) {
        if (e.data.type === 'ta-get-mapped-elements') {
          window.postMessage({
            type: 'ta-mapped-elements',
            data: mappedElements
          }, '*');
        }
      });

      console.log('Test Automation Overlay Loaded ✅');
    })();
  `;
};