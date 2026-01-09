# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial project structure with monorepo setup (pnpm + Turborepo)
- Project documentation:
  - `README.md` / `README.ko.md` - Project overview
  - `ARCHITECTURE.md` / `ARCHITECTURE.ko.md` - System architecture
  - `CONTRIBUTING.md` / `CONTRIBUTING.ko.md` - Contribution guidelines
  - `ALGORA_PROJECT_SPEC.md` / `ALGORA_PROJECT_SPEC.ko.md` - Full specification
  - `CLAUDE.md` - AI assistant context
  - `CHANGELOG.md` - Version history
- Local LLM recommendations for Mac mini M4 Pro (64GB):
  - Tier 1 (Chatter): Llama 3.2 8B, Phi-4, Qwen 2.5
  - Tier 1+ (Enhanced): Mistral Small 3, Qwen 2.5 32B
  - Tier 2 Fallback: Qwen 2.5 72B-Q4
- Internationalization support specification (English/Korean)
- Domain configuration: algora.moss.land
- External LLM support: Anthropic Claude, OpenAI GPT, Google Gemini
- Development ports: Frontend (3200), Backend (3201)

### Changed
- Updated project vision to emphasize scalability and transparency
  - Initial 30 AI agents with infinite scalability architecture
  - "Dynamic Persona Spectrum" for agent cluster naming
  - Focus on transparent visualization of governance activities
- Renamed "Grand Council" to "Dynamic Persona Spectrum: Scalable Multi-Agent System"

### Planned
- 30 AI Agent roster implementation
- Agora discussion system
- Dynamic summoning engine
- 3-Tier LLM scheduler with budget management
- Signal collection adapters (RSS, GitHub, On-chain)
- Real-time WebSocket events
- MOC token governance integration

---

## Version History Format

### [X.Y.Z] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes in existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Vulnerability fixes

---

## Roadmap

### v0.1.0 - Foundation (Planned)
- [ ] Monorepo structure setup
- [ ] Database schema implementation
- [ ] 30-agent roster definition
- [ ] Basic Socket.IO setup
- [ ] AgentLobby component

### v0.2.0 - Agora Core (Planned)
- [ ] Dynamic summoning engine
- [ ] Agora session management
- [ ] Discussion arena UI
- [ ] Human summoning interface

### v0.3.0 - Signal Intelligence (Planned)
- [ ] Signal collection adapters
- [ ] Issue detection system
- [ ] Signals/Issues pages

### v0.4.0 - System Operations (Planned)
- [ ] Activity log service
- [ ] StatusBar component
- [ ] Engine room page
- [ ] Budget manager

### v0.5.0 - Governance (Planned)
- [ ] Proposal system
- [ ] Voting mechanism
- [ ] Delegation support
- [ ] Disclosure reports

### v1.0.0 - Production Release (Planned)
- [ ] Full i18n (en/ko)
- [ ] Responsive design
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Security audit

---

**Note**: This changelog will be updated with every commit as per our documentation policy.
