# Pull Request

## 📝 Change Description

### What changes?
<!-- Brief description of what this PR changes -->

### Why this change?
<!-- Explain the motivation - bug fix, feature, refactoring, etc. -->

## 🎯 Type of Change
<!-- Check all that apply -->
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation only changes
- [ ] 🧹 Code cleanup/refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security improvement
- [ ] 🧪 Test improvements

## 🚦 Risk Level
<!-- Select one -->
- [ ] 🟢 **Low Risk** - Isolated changes, well tested, easy rollback
- [ ] 🟡 **Medium Risk** - Affects multiple areas, some risk of side effects
- [ ] 🔴 **High Risk** - Critical systems affected, potential for significant impact

## 🛡️ Rollback Plan
<!-- How to rollback if this causes issues -->
- [ ] 🎛️ Feature flag available: `FEATURE_NAME` (can be disabled instantly)
- [ ] 🔄 Standard rollback: `./scripts/rollback.sh production`
- [ ] 📋 Custom rollback steps:
  ```bash
  # Add specific rollback commands if needed
  ```

## ✅ Testing Checklist

### Automated Tests
- [ ] Unit tests added/updated for changes
- [ ] Integration tests cover new functionality
- [ ] E2E tests pass locally
- [ ] All existing tests still pass

### Manual Testing
- [ ] Feature works as expected in development
- [ ] No JavaScript console errors
- [ ] No new accessibility issues
- [ ] Performance impact assessed
- [ ] Works on mobile/different screen sizes (if applicable)

### Browser Testing (if UI changes)
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## 🔧 Technical Details

### Components/Files Changed
<!-- List major files or components affected -->
- `packages/frontend/src/...`
- `packages/backend/src/...`
- `packages/hocuspocus/src/...`

### Database Changes
- [ ] No database changes
- [ ] Database migration included
- [ ] Migration tested and reversible
- [ ] Data backup plan if needed

### Feature Flags
- [ ] No feature flags needed
- [ ] New feature flag added: `FEATURE_NAME`
- [ ] Existing feature flag modified: `FEATURE_NAME`

### Dependencies
- [ ] No new dependencies
- [ ] New dependencies added (justify below)
- [ ] Dependencies updated (breaking changes checked)

## 🔗 Related Issues
<!-- Link to GitHub issues, Jira tickets, etc. -->
Closes #[issue_number]
Related to #[issue_number]

## 📱 Screenshots/Demo
<!-- If applicable, add screenshots or GIFs showing the change -->

## 🎭 Deployment Notes
<!-- Special considerations for deployment -->
- [ ] Can be deployed anytime
- [ ] Requires coordination with other services
- [ ] Needs database migration
- [ ] Requires feature flag enable after deploy
- [ ] Needs cache clearing
- [ ] Other: ________________

## 📋 Reviewer Checklist
<!-- For reviewers -->
- [ ] Code follows project conventions
- [ ] Changes are well documented
- [ ] Security implications considered
- [ ] Performance implications considered
- [ ] Error handling is appropriate
- [ ] Logging is adequate for debugging

## 🤖 AI Assistant Notes
<!-- If this PR was created with AI assistance -->
- [ ] This PR was created with AI assistance
- [ ] AI-generated code has been reviewed and tested
- [ ] Prompt/approach documented for reproducibility

---

## ⚡ For Urgent/Hotfix PRs
<!-- Only fill this section for emergency fixes -->
- [ ] This is an emergency hotfix
- [ ] Issue severity: [Critical/High/Medium]
- [ ] Business impact: ________________
- [ ] Stakeholders notified: ________________

---

**Ready for review when:**
- [ ] All checkboxes above are complete
- [ ] CI checks pass
- [ ] Self-review completed
- [ ] Documentation updated (if needed)