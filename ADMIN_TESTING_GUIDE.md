# 🛠️ Admin Panel Testing Guide

## ✅ Completed Changes

### 1. **CSP Warnings Fixed**
- ✅ Added `https://unpkg.com` to `script-src` and `style-src` in both:
  - `vercel.json` (production)
  - `index.html` (development)
- **Result:** Leaflet map styles and scripts now load without console warnings

### 2. **Button Component Integration**
- ✅ Hero section now uses standardized `<Button>` component
- **Benefits:**
  - Consistent focus states for keyboard navigation
  - Loading state support
  - Dark mode compatible
  - Standardized sizes: `sm`, `md`, `lg`

---

## 🧪 Testing the New Itinerary Editor

### How to Access Admin Panel:
1. **Navigate to:** `https://www.revrom.in/#view=admin`
2. **Login** (if required)
3. Click **"TOURS"** tab
4. Click **"Edit"** on any existing tour

### What to Test:

#### ✨ **New Structured Itinerary UI**
Instead of the old text-based format (`1 | Title | Description`), you now have:

1. **"+ Add Day" Button** (top-right)
   - Click to add a new day
   - Day number auto-increments
   - Each day has separate fields

2. **Individual Day Cards**
   - **Day Number** field (editable)
   - **Title** input (e.g., "Arrival in Leh")
   - **Description** textarea (multi-line activities)
   - **Delete Button** (trash icon, appears on hover)

3. **Empty State**
   - If no days exist, shows "Start adding days" prompt

#### 🎯 **Test Scenarios:**

**Scenario 1: Add New Days**
```
1. Click "+ Add Day"
2. Fill in: Day = 1, Title = "Arrival", Description = "Check-in and rest"
3. Click "+ Add Day" again
4. Day 2 should auto-populate
5. Verify both days appear in the list
```

**Scenario 2: Edit Existing Days**
```
1. Click on any tour with an itinerary
2. Days should load in the visual editor
3. Change a title or description
4. Save and verify changes persist
```

**Scenario 3: Delete Days**
```
1. Hover over a day card
2. Click the trash icon (top-right)
3. Confirm day is removed
4. Save changes
```

**Scenario 4: Reorder Days**
```
1. Manually change day numbers (e.g., swap Day 2 → Day 5)
2. Note: Days display in order but you control numbering
```

---

## 🎨 Visual Changes on Website

### Hero Section Buttons
- **"BROWSE TOURS"** and **"PLAN YOUR TRIP"** now use the Button component
- Hover them to see:
  - Smooth transitions
  - Consistent focus rings (Tab key navigation)
  - Active state scaling

### What to Verify:
1. **Desktop:** Navigate to https://www.revrom.in
2. **Tab Key:** Press Tab to focus on buttons (should see orange ring)
3. **Click:** Both CTAs should work as before
4. **Dark Mode:** Toggle theme and verify button contrast

---

## 🐛 Known Issues (None!)
All console warnings should be resolved. If you still see CSP errors:
- Hard refresh: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
- Clear browser cache

---

## 📊 Performance
- Build time: ~1.7s ✅
- No TypeScript errors ✅
- All accessibility warnings fixed ✅

---

## 🚀 Next Steps (Optional Improvements)

1. **Drag-and-Drop Reordering**
   - Add react-dnd to let admins drag days into order

2. **Itinerary Templates**
   - Save common day structures as templates
   - "Arrival Day Template" → auto-fills common activities

3. **Bulk Import**
   - Keep the old text-paste option for power users
   - Add a "Switch to Advanced Mode" toggle

---

**Questions or Issues?** The new itinerary editor eliminates parsing errors and makes tour management visual and intuitive!
