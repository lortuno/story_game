VAR answer = ""
VAR score = 0
EXTERNAL normalize(text)

-> start

=== start ===
Welcome # heading # scene: hall # music: calm
A clue. # hint: Ask a friend
Another clue. # hint: Ask again
Secret word: # input: answer password
+ [Try]
    {
    - normalize(answer) == "opensesame": -> door
    - else: -> wrong
    }

= wrong
~ score = score - 1
Nope. # outcome: fail
+ [Retry] -> start

=== door ===
~ score = score + 1
The door opens. # sfx: creak
+ [Left] -> finale
+ [Right] -> broken_input

=== broken_input ===
Type anything: # input: undeclared_variable
+ [Go] -> finale

=== finale ===
The end. # ending: win # music: stop
-> END

=== function normalize(text) ===
~ return text
