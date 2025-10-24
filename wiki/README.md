# GitHub Wiki Pages

This folder contains markdown files ready to be uploaded to the GitHub Wiki for the MCP OCI Logan Server.

---

## Wiki Pages Included

1. **Home.md** - Wiki home page with overview and quick links
2. **Installation.md** - Complete installation guide
3. **Capabilities.md** - All 33 MCP tools with examples
4. **API-Reference.md** - Official OCI Logging Analytics API documentation
5. **Future-Enhancements.md** - Roadmap and planned features
6. **Troubleshooting.md** - Common issues and solutions

---

## How to Upload to GitHub Wiki

### Method 1: Using GitHub Web Interface (Recommended for Beginners)

1. **Enable Wiki** (if not already enabled):
   - Go to your GitHub repository
   - Click **Settings**
   - Scroll to **Features** section
   - Check **Wikis**

2. **Create Wiki Pages**:
   - Go to **Wiki** tab in your repository
   - Click **Create the first page** or **New Page**
   - Copy content from `wiki/Home.md`
   - Paste into the editor
   - Click **Save Page**

3. **Repeat for each page**:
   - Home.md → Create as "Home"
   - Installation.md → Create as "Installation"
   - Capabilities.md → Create as "Capabilities"
   - API-Reference.md → Create as "API-Reference"
   - Future-Enhancements.md → Create as "Future-Enhancements"
   - Troubleshooting.md → Create as "Troubleshooting"

### Method 2: Using Git (Recommended for Advanced Users)

GitHub Wikis are actually Git repositories themselves!

```bash
# 1. Clone the wiki repository
git clone https://github.com/yourusername/mcp-oci-logan-server.wiki.git

# 2. Copy wiki pages
cd mcp-oci-logan-server.wiki
cp ../mcp-oci-logan-server/wiki/*.md .

# 3. Commit and push
git add .
git commit -m "Add comprehensive wiki pages"
git push origin master
```

### Method 3: Using GitHub CLI

```bash
# Note: This requires the wiki to already exist and be cloned
gh repo clone yourusername/mcp-oci-logan-server.wiki
cd mcp-oci-logan-server.wiki
cp ../mcp-oci-logan-server/wiki/*.md .
git add .
git commit -m "Add wiki pages"
git push
```

---

## Wiki Structure

Once uploaded, your wiki will have this structure:

```
Wiki Home
├── Installation
├── Capabilities
│   ├── Query Execution Tools
│   ├── Advanced Analytics Tools
│   ├── Resource Management Tools
│   ├── Utility Tools
│   ├── Dashboard Management Tools
│   └── Saved Search Tools
├── API Reference
│   ├── Official OCI Documentation
│   ├── API Endpoints Used
│   ├── Authentication Methods
│   ├── Request/Response Format
│   ├── Rate Limits
│   └── Code Examples
├── Future Enhancements
│   ├── High Priority
│   ├── Dashboard API Integration
│   ├── Query Optimization
│   ├── Advanced Analytics
│   └── Long-term Vision
└── Troubleshooting
    ├── Installation Issues
    ├── Configuration Issues
    ├── Authentication Issues
    └── Query Issues
```

---

## Sidebar Navigation

After uploading all pages, create a sidebar for easy navigation:

1. Go to your wiki
2. Click **Add a custom sidebar**
3. Use this content:

```markdown
### MCP OCI Logan Server

**Getting Started**
* [Home](Home)
* [Installation](Installation)

**Using the Server**
* [Capabilities](Capabilities)
* [API Reference](API-Reference)
* [Troubleshooting](Troubleshooting)

**Planning**
* [Future Enhancements](Future-Enhancements)

**External Links**
* [Main Repository](https://github.com/yourusername/mcp-oci-logan-server)
* [Documentation](https://github.com/yourusername/mcp-oci-logan-server/tree/master/docs)
* [Issues](https://github.com/yourusername/mcp-oci-logan-server/issues)
```

---

## Customizing the Wiki

### Update Repository URL

Before uploading, update the placeholder URLs in the wiki pages:

```bash
# Replace yourusername with your actual GitHub username
cd wiki
sed -i '' 's/yourusername/your-actual-username/g' *.md

# Or manually edit each file
```

### Add Your Branding

Update these sections in `Home.md`:
- Repository links
- License information
- Contact information
- Community links

---

## Maintaining the Wiki

### Updating Wiki Pages

**Method 1: Web Interface**
1. Go to wiki page
2. Click **Edit**
3. Make changes
4. Click **Save Page**

**Method 2: Git**
```bash
# Clone wiki repo
git clone https://github.com/yourusername/mcp-oci-logan-server.wiki.git

# Make changes
cd mcp-oci-logan-server.wiki
# Edit files...

# Commit and push
git add .
git commit -m "Update wiki content"
git push
```

### Keeping Wiki in Sync with Code

When you update the main codebase:

1. Update corresponding wiki pages
2. Update version numbers
3. Add new features to Capabilities.md
4. Update roadmap in Future-Enhancements.md

**Automation Idea**:
Create a GitHub Action to sync wiki/ folder with wiki repository on each release.

---

## Wiki Page Templates

### Adding a New Wiki Page

Use this template for consistency:

```markdown
# Page Title

Brief description of what this page covers.

---

## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
3. [Section 3](#section-3)

---

## Section 1

Content here...

---

## Section 2

Content here...

---

## See Also

- [Related Page 1](Link1)
- [Related Page 2](Link2)

---

**Last Updated**: Month Year
**Version**: X.Y.Z
```

---

## Best Practices

### Writing Wiki Content

1. **Be Clear and Concise**
   - Use short paragraphs
   - Break up long content with headings
   - Use bullet points and tables

2. **Add Examples**
   - Show real commands and outputs
   - Include code blocks with syntax highlighting
   - Provide before/after examples

3. **Link Between Pages**
   - Cross-reference related content
   - Use relative links: `[Installation](Installation)`
   - Link to main repo docs when appropriate

4. **Keep It Updated**
   - Update version numbers
   - Remove outdated information
   - Add release dates

5. **Use Visual Aids**
   - Add diagrams where helpful
   - Use tables for comparisons
   - Include status indicators (✅ ⚠️ ❌)

### Markdown Tips for GitHub Wiki

```markdown
# Headers (use # through ######)

**Bold text**
*Italic text*
~~Strikethrough~~

- Bullet lists
  - Nested items

1. Numbered lists
2. Second item

`Inline code`

\`\`\`bash
# Code blocks with syntax highlighting
npm install
\`\`\`

| Table | Header |
|-------|--------|
| Cell  | Cell   |

> Blockquote

[Link text](URL)
![Image alt](image-url)

---
Horizontal rule
```

---

## Wiki Features

### Syntax Highlighting

Supported languages:
```
bash, python, typescript, javascript, json, yaml, sql, markdown
```

Example:
````markdown
```python
def example():
    return "highlighted"
```
````

### Emoji Support

GitHub Wiki supports emoji:
- ✅ Check mark: `✅`
- ⚠️ Warning: `⚠️`
- 🚀 Rocket: `🚀`
- 📚 Books: `📚`
- See [full list](https://github.com/ikatyang/emoji-cheat-sheet)

### Task Lists

```markdown
- [x] Completed task
- [ ] Incomplete task
```

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
```

---

## Troubleshooting Wiki Upload

### Wiki Not Enabled

**Error**: No Wiki tab visible

**Solution**:
1. Go to repository Settings
2. Scroll to Features
3. Check "Wikis"

### Permission Denied

**Error**: `Permission denied (publickey)`

**Solution**:
```bash
# Check SSH key
ssh -T git@github.com

# Or use HTTPS instead
git clone https://github.com/yourusername/mcp-oci-logan-server.wiki.git
```

### Merge Conflicts

**Error**: Conflicts when pushing to wiki

**Solution**:
```bash
# Pull latest changes first
git pull origin master

# Resolve conflicts
# Edit conflicted files...

# Commit resolution
git add .
git commit -m "Resolve merge conflict"
git push
```

---

## Wiki Analytics

### Tracking Wiki Usage

To see wiki statistics:
1. Go to repository Insights
2. Click **Traffic**
3. View wiki page views

### Popular Pages

Monitor which pages are most visited and ensure they're kept up-to-date.

---

## Contributing to Wiki

### Wiki Contribution Guidelines

1. **Propose Changes**
   - Open an issue first for major changes
   - Discuss with maintainers

2. **Make Changes**
   - Fork wiki repo (if using Git method)
   - Make your changes
   - Test markdown rendering

3. **Submit Changes**
   - For web edits: Click Save
   - For Git edits: Submit pull request to main repo
   - Maintainer will update wiki

---

## Wiki Backup

### Backing Up Wiki Content

```bash
# Clone wiki
git clone https://github.com/yourusername/mcp-oci-logan-server.wiki.git

# Create backup
cd mcp-oci-logan-server.wiki
tar -czf wiki-backup-$(date +%Y%m%d).tar.gz *.md

# Store backup safely
```

### Restoring Wiki

```bash
# Extract backup
tar -xzf wiki-backup-20251024.tar.gz

# Push to wiki repo
git add .
git commit -m "Restore wiki from backup"
git push
```

---

## Additional Resources

### GitHub Wiki Documentation
- [About GitHub Wikis](https://docs.github.com/en/communities/documenting-your-project-with-wikis/about-wikis)
- [Adding or editing wiki pages](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages)

### Markdown Resources
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Markdown Cheatsheet](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)

---

## Next Steps

1. **Review Content**
   - Read through each wiki page
   - Update URLs with your GitHub username
   - Customize branding and links

2. **Upload to GitHub**
   - Choose upload method (web or Git)
   - Upload all 5 wiki pages
   - Create sidebar navigation

3. **Announce**
   - Update main README with wiki link
   - Announce in repository Discussions
   - Share with community

4. **Maintain**
   - Keep wiki in sync with code changes
   - Update version numbers on releases
   - Add new features to Capabilities page

---

**Created**: October 2025
**Version**: 1.3.0

For questions about the wiki, open an issue in the main repository.
