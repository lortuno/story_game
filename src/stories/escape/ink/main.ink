// Escape the Quarantine
// Adaptación a ink de la versión PHP original (lortuno, 2020).
// Convenciones de tags (# scene, # image, # hint, # input...) y marcado ([texto](?pista), [texto](enlace)):
// ver specs/story-engine.md

// Última respuesta escrita por el jugador en un campo de texto (# input).
VAR respuesta = ""
// Veces que el jugador se ha equivocado; cambia el epílogo.
VAR fallos = 0

INCLUDE chapters/01_apartamento.ink
INCLUDE chapters/02_tablet.ink
INCLUDE chapters/03_chalet.ink
INCLUDE chapters/04_sotano.ink
INCLUDE chapters/05_cocina.ink
INCLUDE chapters/06_oscuridad.ink
INCLUDE chapters/07_final.ink

-> apartamento

// El motor enlaza normalize() de verdad (minúsculas, sin tildes ni espacios).
// Esta versión en ink es solo el respaldo para probar la historia en Inky.
EXTERNAL normalize(text)
=== function normalize(text) ===
~ return text
