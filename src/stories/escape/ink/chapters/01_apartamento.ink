=== apartamento ===
El caso # heading # scene: header_police # music: investigacion
Sigue las pistas y atrapa al asesino antes de que escape.
Este juego se puede hacer solo o en grupo: solo necesitas un ordenador (o un móvil, aunque se ve mejor en PC) y un bloc de notas. Debería resolverse en menos de 60 minutos. Que corra el reloj...
Sois Jane Peralta y Tony Santiago, dos detectives de la comisaría de Aragón que siguen la pista del famoso criminal Murderchef. Hoy, 23 de abril de 2020, tras una ardua investigación, habéis avanzado en el caso y tenéis una dirección.
Entráis en un apartamento algo destartalado, la última ubicación conocida a la que os ha llevado un testigo. Registráis el piso, bastante modesto; parece solo un sitio de paso, y quien vivía aquí se ha llevado todas sus cosas personales con mucha prisa.
Apenas hay un montón de sábanas revueltas, una planta mustia y varios [libros](libros) polvorientos en la estantería... En el fondo de un cajón del armario aparece una tablet bloqueada con un pósit pegado por detrás.
-> tablet_bloqueada

= tablet_bloqueada
Nota de la tablet # subheading # image: tablet # caption: Tablet bloqueada con un pósit
ldrcc 5 # block: postit
1 (0) # block: postit
2 (1, 1), (3, 3), (8, 2) # block: postit
3 (5, 4) # block: postit
4 (0) # block: postit
5 (1, 1), (4, 2) # block: postit
6 (0) # block: postit
7 (9, 5) # block: postit
Te dice con bastante seguridad que la contraseña va a ser una palabra con sentido, de 7 letras. # hint: Obtener ayuda: llamar al hacker de tu unidad.
Te sugiere que empieces por la página 5 del Libro de Recetas de CC, línea 2... # hint: Volver a llamar al hacker (esperemos que no se canse).
A pesar de tu mal humor, te anima a creer en ti. Solo fíjate bien en cómo vienen escritas las palabras... # hint: Decirle al hacker que no se ande con tantos rodeos.
Introduce la contraseña de la tablet: # input: respuesta password
+ [Desbloquear]
    {
    - respuesta == "TenedoR": -> tablet
    - else: -> contrasena_incorrecta
    }

= contrasena_incorrecta
~ fallos++
Contraseña incorrecta. La tablet vibra y vuelve a la pantalla de bloqueo. # outcome: fail
+ [Volver a intentarlo] -> tablet_bloqueada
