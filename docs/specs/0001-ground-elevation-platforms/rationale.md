# 0001. Raised platform sections: rationale

Decision history for [index.md](index.md). Not needed to build; read it to understand why.

## Context

Today the ground is a single line, `groundY = canvas.clientHeight - GROUND_OFFSET`, recomputed every frame in `GameCanvas.tsx`. `applyVelocity(entity, dt, groundY)` in `engine/physics.ts` moves the mascot and stops its bottom edge on that line. Obstacles (`Obstacle` boxes from `engine/spawner.ts`) all stand on the same line, and `checkAnyCollision` in `engine/collision.ts` ends the run on any overlap. The only skill the game asks for is timing a jump.

The design mockup shows occasional raised sections: a step up to a higher ground level that the mascot must jump onto, followed later by a drop back to the normal level. This adds a second kind of challenge (land on top, not just clear something) and makes the scenery read less flat.

Forces at play:
- **AGENTS.md rules.** Engine code is pure, framework free, works in px and seconds, returns new objects, and takes `random` as an argument. No physics engine. Someone should understand a mechanic by reading one engine file.
- **Casual mobile audience.** Students play this on a phone during a break, so every raised section must be clearable with one ordinary jump at the top speed, and nothing may feel like an unfair death.
- **The jump arc is fixed by current constants.** `GRAVITY = 2400`, `JUMP_FORCE = 800` give a peak of about 133 px and about 0.67 s of air time, so about 366 px of horizontal travel at `MAX_SPEED = 550`.
- **The canvas resizes.** `groundY` moves when the window resizes, so anything that stores an absolute y goes stale. Obstacles already deal with this by being pinned to `groundY` again each frame.
- **Visual style.** Flat 2D, abstract geometric shapes, a slab style ground with an edge strip.

If nothing is decided, the builder would have to invent the ground representation, the landing rule, the side wall rule, and the spawn rule on the fly, and those choices decide whether the game stays fair.

## Options considered

### Option 1: Flat step segments

The ground is the base line `groundY` plus a list of `Platform = { x, width, rise }` objects that scroll like obstacles. The floor under the mascot is the top of the highest platform it overlaps and was already above, otherwise `groundY`. Platform sides are hazards, built as ordinary `Obstacle` boxes.

**Pros**:
- All collision stays rectangle against rectangle, the same idea as `collision.ts`.
- `applyVelocity` already means "stop at this floor line", so it needs no change; only the floor value passed in changes.
- Three tuning numbers (rise, width range, chance) that check directly against the known jump arc.
- Matches the flat, blocky art: a platform is the ground slab drawn higher.

**Cons**:
- Only steps: no ramps or gentle hills, so the terrain can look repetitive.
- Needs a "previous frame feet" rule so the floor does not snap the mascot up onto a platform it ran into.

### Option 2: Continuous height function

The ground is a function `heightAt(x)` built from points with slopes between them; the mascot's floor is `heightAt` at its position.

**Pros**:
- Can express ramps, hills, and smooth terrain.
- Running up a slope needs no jump, which can feel natural.

**Cons**:
- Landing on a slope, sliding, and tilting the mascot need more math and more drawing code, against the "no physics sandbox" rule.
- Fairness is hard to reason about: whether a given slope at a given speed is beatable has no simple answer.
- A sloped look clashes with the established flat geometric style.
- "Jump up onto it" (what the mockup asks for) is not what slopes give you.

## Rationale

The mockup asks for a step the player must jump up onto and later drop from. Steps express exactly that, and nothing more. Because collision stays axis aligned rectangles, the side wall hazard is just one more `Obstacle` box fed to the existing `checkAnyCollision`, and the landing rule is just a different floor value fed to the existing `applyVelocity`. The two files the game's fairness rests on today stay untouched, which keeps the change low risk and the mechanic readable from one file (`terrain.ts`), as AGENTS.md asks.

Tuning for a casual audience is direct with steps. A 48 px rise uses about a third of the 133 px jump peak, so any normal jump clears it with room to spare even at top speed. Platforms 400 to 720 px wide are longer than one full jump at top speed (about 366 px), so a player who jumps early still lands on top rather than clearing the whole platform by accident, and there is time to settle before the drop.

Storing `rise` instead of an absolute y follows the same pattern obstacles use for resizes. The one new hazard resizing introduces (the platform top jumping above the mascot's feet) is handled by keeping the mascot at the same height relative to the ground when `groundY` changes (AC-11).

Smaller calls made here, each with the runner up:
- **Fixed rise of 48 px for v1** rather than a random rise per platform. One number is easier to tune; variety can come later. Runner up: random rise from 32 to 56 px.
- **Score gate rather than time gate for the start.** It matches how the user described it (score 150). Runner up: elapsed time of 15 s, which is the same thing today but would drift if `SCORE_RATE` changes.
- **The mascot stays supported while any part of its width overlaps the platform.** This is the forgiving choice (it drops only when fully past). Runner up: drop when its center passes the edge, which feels more physical but cuts the landing window.
- **Side wall hit ends the run** (user decision), with a 6 px step up tolerance so a corner clip does not feel unfair.
- **Keep the spawner time based.** The wait after a platform is computed from its width and the current speed. Runner up: switch the whole spawner to distance based, which is cleaner but rewrites working code.

