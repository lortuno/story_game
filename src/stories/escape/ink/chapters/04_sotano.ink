=== sotano ===
Afortunadamente habéis seguido a David Sebastián, que resulta ser el nombre en clave de vuestro sospechoso, y al conocer su apodo desbloqueáis el posible paradero de un testigo al que un compañero interrogó la semana pasada.
Si hubierais seguido a cualquier otro habría sido una tremenda pérdida de tiempo: al cabo de unas horas, el capitán de la brigada os informa de que han encontrado los cadáveres de los demás jugadores en unas bolsas de basura, a un par de manzanas de la casa. Parece que a Murderchef no le hizo gracia que le intentaran hacer trampas...
Llegáis a un sótano utilizado como cuarto de lavadoras. Vuestra linterna de luz negra detecta restos de sangre en una esquina: podría ser el lugar donde Murderchef lleva a cabo sus asesinatos. En la pared hay colgado un póster con el mapa de un laberinto. Santiago descubre un panel numérico en una puerta oculta que da acceso a otra sala.
-> keypad

= keypad
El póster del laberinto # subheading # image: laberinto # caption: Póster con el mapa de un laberinto
La forma y el color son esenciales en cocina. Para hacer el zumo, por cada pieza de fruta hay que [echar](?Multiplicar):
Siete gotas de agua. # block: list
Tres rodajas de plátano. # block: list
Apartar la fresa para la próxima preparación. # block: list
Después se [añade](?Suma) la siguiente y se mezcla.
La clave de la puerta # subheading
Observa que la forma y el orden también son relevantes. # hint: Pedir consejo a Carlos Piedra sobre esto.
Os dice que es muy importante que tengáis en cuenta las 4 posiciones del keypad: hay que multiplicar los números disponibles de una pieza, los de otra, y luego sumarlas. # hint: Lo lleváis pensando un rato: volver a llamar a Carlos.
Recordad que el cero es un número... # hint: Carlos os manda un SMS a los 10 minutos.
Combinación del keypad: # input: respuesta keypad 4
+ [Probar la combinación]
    {
    - respuesta == "0426": -> cocina
    - else: -> locked_panel
    }

= locked_panel
~ fallos++
¡Oh, no! El panel se bloquea y, de hecho, ya no deja introducir más combinaciones. Tenéis que esperar a que vengan refuerzos para hackear la puerta y, para entonces, Murderchef ha asesinado a su siguiente víctima y os apartan del caso. Nunca superaréis este fracaso. Looosers. # outcome: fail
+ [Volver atrás y reintentar] -> keypad
