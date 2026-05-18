import os
import re

DIR = r"d:\Major Project\Final\Frontend\src"

REPLACEMENTS = {
    # backgrounds
    r"'rgba\(29,32,38,0\.8\)'": "var(--bg-panel)",
    r"'rgba\(29,32,38,0\.9\)'": "var(--bg-panel-solid)",
    r"'rgba\(29,32,38,0\.4\)'": "var(--bg-panel-light)",
    r"'rgba\(11,14,20,0\.97\)'": "var(--bg-sidebar)",
    r"'rgba\(16,19,26,0\.8\)'": "var(--bg-header)",
    r"'rgba\(16,19,26,0\.5\)'": "var(--bg-header-light)",
    r"'rgba\(16,19,26,0\.6\)'": "var(--bg-header-light)",
    
    # borders
    r"'1px solid rgba\(255,255,255,0\.05\)'": "var(--border-thin)",
    r"'1px solid rgba\(255,255,255,0\.06\)'": "var(--border-medium)",
    r"'1px solid rgba\(255,255,255,0\.04\)'": "var(--border-light)",
    r"'1px solid rgba\(255,255,255,0\.08\)'": "var(--border-strong)",
    r"'rgba\(255,255,255,0\.06\)'": "var(--border-color)",
    r"'rgba\(255,255,255,0\.04\)'": "var(--border-color-light)",
    r"'rgba\(255,255,255,0\.08\)'": "var(--border-color-strong)",

    # specific gradients and exotic rgba
    r"'rgba\(76,214,255,0\.08\)'": "var(--accent-primary-alpha-8)",
    r"'rgba\(76,214,255,0\.2\)'": "var(--accent-primary-alpha-20)",
    r"'rgba\(76,214,255,0\.15\)'": "var(--accent-primary-alpha-15)",
    r"'rgba\(76,214,255,0\.3\)'": "var(--accent-primary-alpha-30)",
    r"'rgba\(218,185,255,0\.06\)'": "var(--accent-secondary-alpha-6)",

    # text colors
    r"'#e1e2eb'": "var(--text-headline)",
    r"'#859399'": "var(--text-muted)",
    r"'#bbc9cf'": "var(--text-body)",
    r"'#4cd6ff'": "var(--accent-primary)",
    r"'#dab9ff'": "var(--accent-secondary)",
    r"'#10131a'": "var(--bg-main)",
    r"'#001f28'": "var(--on-accent-primary)",
    r"'#00a8cc'": "var(--accent-primary-dark)",
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern, replacement in REPLACEMENTS.items():
        # Using regex substitution
        val = f"'{replacement}'" if "var(" in replacement else replacement
        content = re.sub(pattern, val, content)
    
    if original != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(DIR):
    for file in files:
        if file.endswith(".tsx"):
            process_file(os.path.join(root, file))

print("Done replacing colors.")
