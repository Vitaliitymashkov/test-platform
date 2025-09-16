/**
 * Simpler overlay implementation for testing
 */

export const getSimpleOverlayScript = () => {
  return `
    // Check if already injected
    if (window.__testAutomationSimple) {
      console.log('Overlay already exists');
      return;
    }
    window.__testAutomationSimple = true;

    console.log('Starting overlay injection...');

    // Create and inject styles
    const style = document.createElement('style');
    style.textContent = \`
      #ta-simple-overlay {
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        width: 300px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        padding: 15px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
        z-index: 2147483647 !important;
        font-family: system-ui, -apple-system, sans-serif !important;
      }
      
      #ta-simple-overlay h3 {
        margin: 0 0 10px 0 !important;
        font-size: 16px !important;
      }
      
      #ta-simple-overlay button {
        background: white !important;
        color: #667eea !important;
        border: none !important;
        padding: 8px 12px !important;
        margin: 5px !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        font-size: 14px !important;
      }
      
      #ta-simple-overlay button:hover {
        background: #f0f0f0 !important;
      }
      
      .ta-highlight-element {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        background-color: rgba(59, 130, 246, 0.1) !important;
      }
    \`;
    document.head.appendChild(style);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'ta-simple-overlay';
    overlay.innerHTML = \`
      <h3>🎯 Test Automation Active</h3>
      <div>
        <button onclick="window.__taStartInspect()">🔍 Inspect</button>
        <button onclick="window.__taStartSelect()">👆 Select</button>
        <button onclick="window.__taRecord()">⏺️ Record</button>
      </div>
      <div id="ta-status" style="margin-top: 10px; font-size: 12px;"></div>
    \`;
    document.body.appendChild(overlay);

    // Global functions
    let inspecting = false;
    let selecting = false;
    let recording = false;
    let hoveredElement = null;

    window.__taStartInspect = function() {
      inspecting = !inspecting;
      document.getElementById('ta-status').innerText = inspecting ? 'Hover to inspect elements' : '';
      console.log('Inspect mode:', inspecting);
    };

    window.__taStartSelect = function() {
      selecting = !selecting;
      document.getElementById('ta-status').innerText = selecting ? 'Click an element to select' : '';
      console.log('Select mode:', selecting);
    };

    window.__taRecord = function() {
      recording = !recording;
      document.getElementById('ta-status').innerText = recording ? 'Recording actions...' : 'Recording stopped';
      console.log('Recording:', recording);
    };

    // Mouse event handlers
    document.addEventListener('mouseover', function(e) {
      if (!inspecting) return;
      if (e.target.id === 'ta-simple-overlay' || e.target.closest('#ta-simple-overlay')) return;
      
      if (hoveredElement) {
        hoveredElement.classList.remove('ta-highlight-element');
      }
      
      e.target.classList.add('ta-highlight-element');
      hoveredElement = e.target;
    });

    document.addEventListener('mouseout', function(e) {
      if (!inspecting) return;
      e.target.classList.remove('ta-highlight-element');
    });

    document.addEventListener('click', function(e) {
      if (e.target.closest('#ta-simple-overlay')) return;
      
      if (selecting) {
        e.preventDefault();
        e.stopPropagation();
        
        const selector = e.target.id ? '#' + e.target.id : e.target.tagName.toLowerCase();
        const name = prompt('Enter name for this element:', 'element_' + Date.now());
        
        if (name) {
          document.getElementById('ta-status').innerText = 'Mapped: ' + name + ' -> ' + selector;
          console.log('Element mapped:', { name, selector });
        }
        
        selecting = false;
        return false;
      }
      
      if (recording) {
        console.log('Recorded click on:', e.target);
      }
    }, true);

    console.log('Test Automation Overlay Loaded Successfully! ✅');
    document.getElementById('ta-status').innerText = 'Ready';
  `;
};