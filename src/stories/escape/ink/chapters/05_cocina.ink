=== cocina ===
Al abrir la puerta descubrís una pequeña cocina con toda una suerte de utensilios, ingredientes y tarros; algunos contienen lo que muy probablemente son partes del cuerpo de sus víctimas, que Murderchef ha conservado para sus recetas. # sfx: puerta
En un papel pone «la receta definitiva», junto a la dirección de una web en la que consultarla.
-> receta

= receta
[La receta](?Pista: es un acertijo) # subheading # image: tarros # caption: Tarros en la cocina de Murderchef
Coger las piezas en el orden indicado, de una en una (o el número que se indique), y batir a 0.5 de velocidad.
0:24 · [2 huevos](huevos) # block: olist
0:40 · [Mantequilla](mantequilla) # block: olist
2:26 · [Sal](sal) # block: olist
4:19 · [Aceite](aceite) # block: olist
2:44 · [1 cebolla](cebolla) # block: olist
0:04 · [Dos patatas](patatas) # block: olist
Ver en: lawebsecretademurderchef/xxxxxxxx # block: note
Te indica que cada vídeo contiene una palabra de un **acertijo**, en ese orden, para formar una frase. Si el número de ingredientes es 2, son dos palabras. Te aconseja que apuntes lo que oigas y le des sentido en conjunto. # hint: Pedir ayuda a tu colega Carlos Piedra.
¿Qué se ve con los ojos cerrados? # hint: Volver a llamar a Carlos Piedra.
Dirección de la web (lo que va en lugar de las x «_ _ _ _ _ _ _ _ _»): # input: respuesta text
+ [Visitar la web]
    {
    - normalize(respuesta) == "oscuridad": -> oscuridad
    - else: -> web_equivocada
    }

= web_equivocada
~ fallos++
Error 404: la página no existe. Murderchef no deja su receta a la vista de cualquiera. # outcome: fail
+ [Volver a la receta] -> receta
