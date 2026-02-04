# OSMD v1.9.55 Release Notes

## New Feature: Force Fixed Measures Per Line

### Overview
Added a new `EngravingRules` property `ForceRenderXMeasuresPerLineAkaSystem` that allows forcing an exact number of measures per line, bypassing width constraints.

### Problem Solved
When using `RenderXMeasuresPerLineAkaSystem` to set a fixed number of measures per line (e.g., 4), OSMD would sometimes render fewer measures (e.g., 3) on smaller viewports because:
1. It reserved space for the next measure's key/time signature instructions
2. It checked if measures would physically fit based on calculated widths

This was overly conservative and prevented the desired fixed layout even when there was actually room for the measures.

### Changes Made

#### 1. New EngravingRule Property
**File**: `src/MusicalScore/Graphical/EngravingRules.ts`

Added:
```typescript
/** When true, forces exactly RenderXMeasuresPerLineAkaSystem measures per line, ignoring width constraints.
 * Only applies when RenderXMeasuresPerLineAkaSystem > 0. Use with caution as measures may overlap if too narrow. Default false. */
public ForceRenderXMeasuresPerLineAkaSystem: boolean;
```

Default value: `false`

#### 2. Updated Measure Fitting Logic
**File**: `src/MusicalScore/Graphical/MusicSystemBuilder.ts`

**Previous behavior (v1.9.54)**:
- When `RenderXMeasuresPerLineAkaSystem > 0`: Don't reserve space for next measure's instructions
- Still respect width constraints (`measureFitsInSystem` check)

**New behavior (v1.9.55)**:
- When `ForceRenderXMeasuresPerLineAkaSystem = true` AND `RenderXMeasuresPerLineAkaSystem > 0`:
  - Force measures to fit until reaching the target count
  - Completely bypass width constraint checks
  - Measures will always render exactly as specified, regardless of available width

```typescript
// When ForceRenderXMeasuresPerLineAkaSystem is enabled, force measures to fit until we reach the target count
if (this.rules.ForceRenderXMeasuresPerLineAkaSystem && 
    this.rules.RenderXMeasuresPerLineAkaSystem > 0 &&
    currentMeasureNumberInSystem < this.rules.RenderXMeasuresPerLineAkaSystem) {
    measureFitsInSystem = true;
}
```

### Usage

#### Basic Usage (Respects Width - Default Behavior)
```javascript
osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
// Will try to fit 4 measures, but may render fewer if width constraints prevent it
```

#### Force Exact Count (New Feature)
```javascript
osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
osmd.EngravingRules.ForceRenderXMeasuresPerLineAkaSystem = true;
// Will ALWAYS fit exactly 4 measures per line, regardless of width
// ⚠️ Warning: Measures may overlap if viewport is too narrow
```

### Migration Guide

**No breaking changes.** The default behavior is unchanged.

- If you were already using `RenderXMeasuresPerLineAkaSystem`, your code will work exactly as before
- To opt-in to the new forcing behavior, explicitly set `ForceRenderXMeasuresPerLineAkaSystem = true`

### Compatibility

- **Backward compatible**: ✅ Yes
- **Breaking changes**: ❌ None
- **Default behavior**: Unchanged

### Installation

```bash
pnpm add https://github.com/guiles00/opensheetmusicdisplay/releases/download/v1.9.55/opensheetmusicdisplay-1.9.55.tgz
```

Or update your `package.json`:
```json
"opensheetmusicdisplay": "https://github.com/guiles00/opensheetmusicdisplay/releases/download/v1.9.55/opensheetmusicdisplay-1.9.55.tgz"
```

### Warnings & Caveats

⚠️ **Use `ForceRenderXMeasuresPerLineAkaSystem = true` with caution:**
- Measures may overlap if the viewport is too narrow
- Best used when you know the measures will fit in your target viewports
- Consider responsive design: You may want to disable forcing on very small screens

### Example Use Case

Perfect for music education apps or sheet music viewers where you want consistent measure counts across different device orientations:

```javascript
// On tablet landscape: Always show 4 measures
if (isTabletLandscape) {
    osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
    osmd.EngravingRules.ForceRenderXMeasuresPerLineAkaSystem = true;
}

// On mobile portrait: Let OSMD decide based on width
if (isMobilePortrait) {
    osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 0; // Disable fixed count
    osmd.EngravingRules.ForceRenderXMeasuresPerLineAkaSystem = false;
}
```
