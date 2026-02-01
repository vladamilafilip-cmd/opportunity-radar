
# Add Logo to Login, Register, and Landing Pages

## Current State

All three pages currently use a Lucide `Radar` icon as a placeholder:

- **Login.tsx** (lines 51-55): Shows a small Radar icon in a rounded container
- **Register.tsx** (lines 80-84): Same pattern as Login
- **Landing.tsx**: Uses Radar icon in two places:
  - Header (lines 25-27): Navigation bar logo
  - Footer (line 170): Footer branding

## Implementation

Replace the Radar icon placeholders with the actual logo image (`/favicon.jpg`) that was just uploaded.

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Login.tsx` | Replace Radar icon with `<img>` tag using `/favicon.jpg` |
| `src/pages/Register.tsx` | Same change as Login |
| `src/pages/Landing.tsx` | Replace Radar icon in header and footer with logo image |

### Technical Details

**Login.tsx & Register.tsx**

Replace:
```tsx
<div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
  <Radar className="h-7 w-7 text-primary" />
</div>
```

With:
```tsx
<img 
  src="/favicon.jpg" 
  alt="IQ200 RADAR" 
  className="h-16 w-16 rounded-xl object-cover"
/>
```

**Landing.tsx - Header**

Replace:
```tsx
<div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
  <Radar className="h-6 w-6 text-primary" />
</div>
```

With:
```tsx
<img 
  src="/favicon.jpg" 
  alt="IQ200 RADAR" 
  className="h-10 w-10 rounded-xl object-cover"
/>
```

**Landing.tsx - Footer**

Replace:
```tsx
<Radar className="h-5 w-5 text-primary" />
```

With:
```tsx
<img 
  src="/favicon.jpg" 
  alt="IQ200 RADAR" 
  className="h-6 w-6 rounded object-cover"
/>
```

### Cleanup

- Remove unused `Radar` import from Lucide in all three files (if no longer used elsewhere in the file)
- Landing.tsx still uses other Lucide icons so we'll just remove `Radar` from the import list

### Result

- Consistent branding across all public-facing pages
- Professional appearance with the actual company logo
- Logo properly sized and rounded to match the existing design system
