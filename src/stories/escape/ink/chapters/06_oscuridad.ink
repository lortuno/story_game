=== oscuridad ===
Al entrar en la web aparecen cuatro imágenes: las partes del cuerpo que va a usar en su receta especial. En el pie de la página veis, en letra Moon de tamaño 11, una siniestra frase: «Recolectar en _».
Examináis las fotos a fondo para saber más. Debe de haber alguna pista dentro de ellas.
-> ingredientes

= ingredientes
Ingredientes de la receta especial # subheading # image: ojo # caption: María Luisa González # image: oreja # caption: Pedro Cristóbal # image: lengua # caption: Ignacio de Lucas # image: pie # caption: Susana Romero
Te comenta que Pedro Cristóbal murió asesinado el 15 de febrero de este año. # hint: Pedir a vuestra colega Margarita Díez que repase el expediente del caso por si hubiera más información.
Dice que no pinta nada en este tipo de prueba, pero te recuerda que hoy es 23/04/2020. # hint: Llamar al hacker (le echáis de menos).
Os sugiere que consultéis un calendario lunar para entender cuándo le toca matar. # hint: Mandar un mensaje de ayuda a Tina, que siempre tiene alguna idea.
Nombre de la próxima víctima: # input: respuesta text
+ [Enviar una patrulla]
    {
    - normalize(respuesta) == "marialuisagonzalez": -> final
    - normalize(respuesta) == "pedrocristobal": -> victima_muerta
    - else: -> direccion_equivocada
    }

= victima_muerta
~ fallos++
¡Pero cómo va a ser Pedro, lumbreras! Vuestro jefe os dice que no le hagáis perder el tiempo con órdenes de protección para personas que ya están muertas, y os recomienda que os esmeréis más si no queréis que estos sean vuestros últimos minutos como policías. # outcome: fail
+ [Volver atrás y reintentar] -> ingredientes

= direccion_equivocada
~ fallos++
¡Vaya! Habéis enviado una patrulla a la dirección equivocada y habéis dejado escapar al criminal. Una persona aparece muerta a las pocas horas y Murderchef sigue suelto. Os destituyen del cuerpo y os pasáis los días comiendo nachos con queso en el sótano de vuestros padres. Looosers. # outcome: fail
+ [Volver atrás y reintentar] -> ingredientes
