"""UI theme helpers for Streamlit app."""
from __future__ import annotations
import streamlit as st

def inject_css(dark_mode: bool = True) -> None:
    """Inject CSS with theme support (light/dark mode)."""
    
    if dark_mode:
        # Dark theme - sleek, modern, eye candy
        theme_vars = """
            --bg-primary: #0a0e1a;
            --bg-secondary: #0f1419;
            --bg-tertiary: #161b26;
            --surface: rgba(255, 255, 255, 0.03);
            --surface-hover: rgba(255, 255, 255, 0.06);
            --border: rgba(255, 255, 255, 0.06);
            --border-focus: rgba(139, 92, 246, 0.3);
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent-primary: #8b5cf6;
            --accent-secondary: #06b6d4;
            --accent-gradient: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
            --user-bubble: rgba(139, 92, 246, 0.12);
            --user-border: rgba(139, 92, 246, 0.25);
            --assistant-bubble: rgba(6, 182, 212, 0.12);
            --assistant-border: rgba(6, 182, 212, 0.25);
            --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
            --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
            --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
            --glow: 0 0 20px rgba(139, 92, 246, 0.15);
        """
    else:
        # Light theme - clean, minimal, professional
        theme_vars = """
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --surface: rgba(0, 0, 0, 0.02);
            --surface-hover: rgba(0, 0, 0, 0.04);
            --border: rgba(0, 0, 0, 0.08);
            --border-focus: rgba(139, 92, 246, 0.4);
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #94a3b8;
            --accent-primary: #8b5cf6;
            --accent-secondary: #06b6d4;
            --accent-gradient: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
            --user-bubble: rgba(139, 92, 246, 0.08);
            --user-border: rgba(139, 92, 246, 0.2);
            --assistant-bubble: rgba(6, 182, 212, 0.08);
            --assistant-border: rgba(6, 182, 212, 0.2);
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
            --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.12);
            --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.15);
            --glow: 0 0 20px rgba(139, 92, 246, 0.1);
        """
    
    st.markdown(
        f"""
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            
            /* Theme Variables */
            :root {{
                {theme_vars}
            }}
            
            /* Base Styles */
            html, body, .stApp {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }}
            
            .stApp {{
                background: var(--bg-primary);
                color: var(--text-primary);
            }}
            
            /* Container */
            section.main > div {{
                max-width: 900px;
                margin: 0 auto;
            }}
            
            .block-container {{
                padding-top: 1.5rem;
                padding-bottom: 3rem;
            }}
            
            /* Header */
            .app-header {{
                text-align: center;
                padding: 2rem 0 2.5rem;
                border-bottom: 1px solid var(--border);
                margin-bottom: 2rem;
                position: relative;
            }}
            
            .app-logo {{
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 64px;
                height: 64px;
                background: var(--accent-gradient);
                border-radius: 20px;
                margin-bottom: 1rem;
                box-shadow: var(--glow);
                font-size: 2rem;
            }}
            
            .app-title {{
                font-size: 2.25rem;
                font-weight: 800;
                background: var(--accent-gradient);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 0.5rem;
                letter-spacing: -0.02em;
            }}
            
            .app-subtitle {{
                color: var(--text-secondary);
                font-size: 1rem;
                font-weight: 500;
            }}
            
            .theme-toggle {{
                position: absolute;
                top: 1rem;
                right: 1rem;
            }}
            
            /* Section Headers */
            h1, h2, h3 {{
                color: var(--text-primary);
                font-weight: 700;
                letter-spacing: -0.01em;
            }}
            
            /* Cards & Surfaces */
            [data-testid="stExpander"] {{
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 16px;
                margin-bottom: 1rem;
                overflow: hidden;
                box-shadow: var(--shadow-sm);
            }}
            
            [data-testid="stExpander"] summary {{
                font-weight: 600;
                color: var(--text-primary);
                padding: 1rem 1.25rem;
            }}
            
            [data-testid="stExpander"] > div {{
                padding: 1rem 1.25rem;
            }}
            
            /* Buttons */
            .stButton > button {{
                background: var(--accent-gradient);
                color: white;
                font-weight: 600;
                border: none;
                border-radius: 12px;
                padding: 0.625rem 1.25rem;
                box-shadow: var(--shadow-md);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                letter-spacing: 0.01em;
            }}
            
            .stButton > button:hover {{
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg);
                filter: brightness(1.1);
            }}
            
            .stButton > button:active {{
                transform: translateY(0);
            }}
            
            /* Secondary Button Style */
            .secondary-btn > button {{
                background: var(--surface) !important;
                color: var(--text-primary) !important;
                border: 1px solid var(--border) !important;
                box-shadow: var(--shadow-sm) !important;
            }}
            
            .secondary-btn > button:hover {{
                background: var(--surface-hover) !important;
            }}
            
            /* Input Fields */
            .stTextInput > div > div > input,
            .stSelectbox > div > div > div {{
                background: var(--surface);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 0.625rem 0.875rem;
                transition: all 0.2s ease;
            }}
            
            .stTextInput > div > div > input:focus,
            .stSelectbox > div > div > div:focus {{
                border-color: var(--border-focus);
                box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
            }}
            
            /* Chat Input */
            div[data-testid="stChatInput"] {{
                border-top: 1px solid var(--border);
                background: var(--bg-secondary);
                padding: 1rem 0 0.5rem;
            }}
            
            div[data-testid="stChatInput"] textarea {{
                background: var(--surface);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: 16px;
                padding: 0.875rem 1rem;
                font-size: 0.9375rem;
            }}
            
            div[data-testid="stChatInput"] textarea:focus {{
                border-color: var(--border-focus);
                box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.08);
            }}
            
            /* Chat Messages */
            .stChatMessage {{
                padding: 1rem 0;
            }}
            
            [data-testid="stChatMessageContent"] {{
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 16px;
                padding: 1rem 1.25rem;
                box-shadow: var(--shadow-sm);
            }}
            
            /* User Message */
            [data-testid="stChatMessage"][data-testid*="user"] [data-testid="stChatMessageContent"] {{
                background: var(--user-bubble);
                border-color: var(--user-border);
            }}
            
            /* Assistant Message */
            [data-testid="stChatMessage"][data-testid*="assistant"] [data-testid="stChatMessageContent"] {{
                background: var(--assistant-bubble);
                border-color: var(--assistant-border);
            }}
            
            /* File Uploader */
            .stFileUploader {{
                background: var(--surface);
                border: 2px dashed var(--border);
                border-radius: 16px;
                padding: 1.5rem;
                transition: all 0.2s ease;
            }}
            
            .stFileUploader:hover {{
                border-color: var(--accent-primary);
                background: var(--surface-hover);
            }}
            
            /* Select Box */
            .stSelectbox label {{
                color: var(--text-secondary);
                font-weight: 600;
                font-size: 0.875rem;
                margin-bottom: 0.5rem;
            }}
            
            /* Checkbox */
            .stCheckbox label {{
                color: var(--text-primary);
                font-weight: 500;
            }}
            
            /* Pills/Tags */
            .suggestion-pill {{
                display: inline-block;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 999px;
                padding: 0.5rem 1rem;
                margin: 0.25rem;
                color: var(--text-primary);
                font-size: 0.875rem;
                font-weight: 500;
                transition: all 0.2s ease;
                cursor: pointer;
            }}
            
            .suggestion-pill:hover {{
                background: var(--surface-hover);
                border-color: var(--accent-primary);
                transform: translateY(-1px);
            }}
            
            /* Status Badge */
            .status-badge {{
                display: inline-flex;
                align-items: center;
                gap: 0.375rem;
                padding: 0.375rem 0.75rem;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 999px;
                font-size: 0.8125rem;
                font-weight: 600;
                color: var(--text-secondary);
            }}
            
            .status-badge.active {{
                background: rgba(34, 197, 94, 0.1);
                border-color: rgba(34, 197, 94, 0.3);
                color: #22c55e;
            }}
            
            /* Scrollbar */
            ::-webkit-scrollbar {{
                width: 8px;
                height: 8px;
            }}
            
            ::-webkit-scrollbar-track {{
                background: var(--bg-secondary);
            }}
            
            ::-webkit-scrollbar-thumb {{
                background: var(--border);
                border-radius: 4px;
            }}
            
            ::-webkit-scrollbar-thumb:hover {{
                background: var(--text-muted);
            }}
            
            /* Hide Streamlit Branding */
            #MainMenu {{visibility: hidden;}}
            footer {{visibility: hidden;}}
            header {{visibility: hidden;}}
        </style>
        """,
        unsafe_allow_html=True,
    )
