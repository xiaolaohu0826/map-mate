# MapMate — Architecture

## Component Tree

```
app/page.tsx (Client Component — orchestrator)
├── MapWrapper          (dynamic, ssr:false) — Google Maps canvas
├── SearchBar           (dynamic, ssr:false) — Places Autocomplete
├── NotesSidebar        — sliding panel with saved notes list
├── MarkerDialog        — modal for adding a new marker
└── MusicPlayer         — fixed bottom-right music controller
```

## Data Flow

```
[Supabase]  ──on mount──►  page.tsx  ──markers prop──►  MapWrapper
                                │                         (renders emoji markers)
                          onMapClick
                                │
                         MarkerDialog  ──onSave──►  supabase.insert()
                                                         │
                                                    setMarkers()
                                                         │
                                                    MapWrapper re-renders

NotesSidebar  ──onMarkerFocus──►  focusTarget state  ──►  MapWrapper.panTo()
SearchBar     ──onPlaceSelected──►  panToRef.current()  ──►  map.panTo()
```

## Key Design Decisions

- **`MapWrapper` is purely display + event-driven**: it syncs markers from props declaratively and fires `onMapClick` upward.
- **`onPanReady` callback**: MapWrapper exposes its `panTo` function to the parent after initialization, avoiding the need for refs in parent scope.
- **Dynamic imports with `ssr:false`**: All Google Maps components must run in the browser only.
- **Supabase as the single source of truth**: markers are fetched on mount and optimistically updated in local state after insert.
- **MusicPlayer fetches `/api/music`**: a Next.js route reads `public/music/` at runtime, so adding `.mp3` files is sufficient.
