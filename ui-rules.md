# Antigravity UI Style Instructions

Whenever I ask to "make a UI better," "make it premium," or "polish this layout," strictly apply these architectural transformations to the code:

- **Canvas & Cards:** Change the main canvas background to a soft layout (e.g., `bg-slate-50`). Convert cards to pure white (`bg-white`) with razor-thin, subtle borders (`border-slate-100`) and soft ambient shadows (`shadow-sm`). Remove all harsh, dark outlines.
- **Typography:** Tighten the text hierarchy. Make main headers dark slate (`text-slate-900`) and secondary metadata a muted gray (`text-slate-500`). Use `tracking-wider` on small uppercase labels.
- **Spacing & Layout:** Aggressively add breathing room and whitespace between elements. Eliminate layout crowding so the screen feels expansive and polished.
- **Micro-interactions:** Inject smooth transitions and tactile feedback into every single button and interactive card (e.g., `transition-all duration-200` and `active:scale-98`).