#Shoreline Project Readme

##Heuristic

The heuristic function returns the number of objects that are above the object that should be moved to satisfy the goal. If the
relation is inside or on-top, the sum of the number of object above the  objects that should be moved and the number of objects above
the destination is the heuristic value.

If the object that should be moved is held by the arm, the heuristic value is 0.

If more than two objects could be moved to satisfy a goal (left or right of, for example ), the heuristic value is the number of
objects above the optimal object to move. For example, if the goal is to place the red box right of the green box and the current
state is not  a goal and there are 3 objects above the red box and 6 above the green box, the heuristic value is 3.

If there is more than one goal, the heuristic value for the goal that seems to be closest for the heuristic function is returned.

##‘All’ quantifier and distinction between ‘any’ and ‘the’ quantifiers

We attempted to handle every possible case in a sensible way and give specific ways of interpreting the various utterances possible.
To begin with, we distinguish the two singular quantifiers. The main difference is that ‘any’ or ‘a’ may refer to some available
object of the specific description, but ‘the’ must refer to a specific object. The difference can be illustrated by an example. Of
course, the examples become interesting once we allow a usage of the `all` quantifier where we have to take care of many objects and
form conjunctive goals.

In the small world, the command ‘move all balls beside any box’ would give the following interpretation if we were treating ‘any’ as
‘the’

`beside(e,l) & beside(f,l) | beside(e,k) & beside(f,k) | beside(e,m) & beside(f,m)`

We see, that we have the two balls e, f paired with one box at a time. This is also the interpretation given by the demo in the course
web page. However, there are in fact more valid interpretations, because this command does not intrinsically demand that the box must
be the same (1). Our interpreter gives many more possibilities, as follows:

`beside(e,l) & beside(f,l) | beside(e,l) & beside(f,k) | beside(e,l) & beside(f,m) | beside(e,k) & beside(f,l)` 
`| beside(e,k) & beside(f,k) | beside(e,k) & beside(f,m) | beside(e,m) & beside(f,l) | beside(e,m) & beside(f,k) `
`| beside(e,m) & beside(f,m)`

The above relations comprise every possible combination if one wants to treat the ‘any’ quantifier justly. The downside of this
approach is that in big worlds, utterances with this structure and little information about the object will result to huge goals.
However, in principle, it is correct and we argue that it is even more correct, by point (1).
This approach also allows us to interpret some more complex and dubious examples. For instance, ‘put a ball in every large box’.

`inside(e,l) & inside(f,l) | inside(e,l) & inside(f,k) | inside(e,k) & inside(f,l) | inside(e,k) & inside(f,k)`

In this case, we get all combinations based on available interpretations. The second and third goal can be achieved and indeed this
command works. Two impossible goals are also included and this is natural because, in principle, such a state of affairs would satisfy
the utterance. It is easily explained why we get these pairs; the way the program calculates these pairs of the form ‘put all x in/on
top any z’ or ‘put any x in/on top all z’ is that we first group by the relations that have the same entity object.

So, let `A = {inside(e,l), inside(e,k)} and B = {inside(f,l), inside(f,k)}`

They have been, effectively, grouped by the ball (entity object). Subsequently, we take the cartesian product

`A ✕ B = {(inside(e,l), inside(f,l)), (inside(e,l), inside(f,k)), (inside(e,k), inside(f,l)), (inside(e,k), inside(f,lk))}`

Hence, these pairs form the conjuncts and each element is a part of the greater DNF formula. This idea is flexible and covers any case
, so depending on how many objects we have we have n sets by grouping; and then the cartesian product of n sets. More specifically, if
we have b number of balls, the conjunct tuples will contain b atoms. And the number of tuples of these conjuncts depends on the how
many different sets (groups) we have. In other words, the cardinality of the cartesian product defines how many different OR parts we
have. And we know the following:

`|A ✕ B ✕ C| = |A| ∙ |B| ∙ |C| `and so forth, so this gives us an idea of the scale.

Therefore, we needed different cases for such utterances, particularly when they were paired with the relations ‘inside’ and ‘on top’.
For some other cases where the relation is different, we do not follow this approach as it would produce spurious results. In most of
the other cases, we add for every entity object a relation as part of the conjunct and then push them in the interpretation. We also
add some sensible caveats that avoid impossible situations like ‘put all balls in all boxes’ and so on.

Two nice examples: 
‘put any box above all boxes’. Small world.
‘put all bricks on top of a red object’. Medium world

`above(l,k) & above(l,m) | above(k,l) & above(k,m) | above(m,l) & above(m,k)`

`ontop(a,c) & ontop(b,h) | ontop(a,c) & ontop(b,j) | ontop(a,c) & ontop(b,c)`

The latter of course does not work with the planner, but the interpretation is nice.

##Ambiguities 

The ambiguity issue we tackled was a small one and the simplest solution possible was given. We do not try to disambiguate different
parsings that rely on grammar, but rather, we make clarification questions when some commands refer to some object with the singular
quantifier ‘the’, but multiple objects match the vague description. Hence, for instance: ‘take the ball’ or ‘put the small ball in the
box’ contain ambiguity. We cannot determine which ball in the former and which box in the latter example the user is referring to. For
this reason, we form a question based on the possible objects and ask ‘Did you mean the large white ball or the small black ball?’ We
also show in which stack the object is to avoid any confusion if two objects are identical. The only case where this solution is
inadequate is when there are two objects of the same size, color, and form in the same stack. We construct the question and throw it
as an ambiguity error.

##Extra notes

Some final information; we wanted to mention that we solved the recursive descriptions in the interpreter. Furthermore, we can handle
any command even if an object is held by the robot arm (in fact, we realised quite late that this case was not addressed). And lastly,
commands that refer to ‘it’ when the robot is holding something, are also covered. For example, while holding an object and the
utterance is ‘put it beside the red box’, it understand that ‘it’ refers to the one the arm is holding.

