// Windsurf Configuration File
module.exports = {
  // Project name
  name: 'test-platform',
  
  // Environment configuration
  environment: {
    // Define environment variables here
    variables: {
      NODE_ENV: 'development',
    },
  },
  
  // Build configuration
  build: {
    // Command to build your project
    command: 'npm run build',
    // Output directory
    outputDir: 'dist',
  },
  
  // Deployment configuration
  deploy: {
    // Deployment provider (e.g., 'netlify', 'vercel', etc.)
    provider: 'netlify',
    // Site ID (if deploying to an existing site)
    // siteId: 'your-site-id',
    // Deployment settings
    settings: {
      // Branch to deploy from
      branch: 'main',
    },
  },
  
  // Server configuration for local development
  server: {
    // Port to run the development server on
    port: 3000,
    // Host to bind the server to
    host: 'localhost',
  },
  
  // Custom rules
  rules: {
    // Cursor positioning rules
    cursor: {
      // Default indentation settings
      indentation: {
        size: 2,         // Number of spaces per indentation level
        type: 'space',   // 'space' or 'tab'
        autoIndent: true // Auto-indent on new lines
      },
      
      // Language-specific cursor behavior
      languages: {
        typescript: {
          // TypeScript-specific cursor rules
          indentation: {
            size: 2,
            type: 'space'
          },
          // Smart positioning after certain characters
          smartPositioning: {
            afterBrackets: true,    // Position cursor after opening brackets
            afterCommas: true,      // Position cursor after commas in lists
            afterColons: true,      // Position cursor after colons in objects
            afterSemicolons: false  // Don't position cursor after semicolons
          }
        },
        javascript: {
          // JavaScript uses the same rules as TypeScript
          extends: 'typescript'
        },
        html: {
          indentation: {
            size: 2,
            type: 'space'
          },
          // Auto-close HTML tags
          autoCloseTags: true
        },
        css: {
          indentation: {
            size: 2,
            type: 'space'
          }
        },
        sql: {
          indentation: {
            size: 4,
            type: 'space'
          },
          // Uppercase SQL keywords
          uppercaseKeywords: true
        }
      },
      
      // File-specific cursor rules (overrides language rules)
      files: {
        // Example: Different rules for configuration files
        '**/*.json': {
          indentation: {
            size: 2,
            type: 'space'
          }
        },
        // Example: Different rules for markdown files
        '**/*.md': {
          indentation: {
            size: 2,
            type: 'space'
          },
          // Preserve trailing whitespace in markdown
          preserveTrailingWhitespace: true
        }
      }
    },
  },
};
