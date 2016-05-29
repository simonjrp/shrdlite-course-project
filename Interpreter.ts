///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="Util.ts"/>

/**
* Interpreter module
*
* The goal of the Interpreter module is to interpret a sentence
* written by the user in the context of the current world state. In
* particular, it must figure out which objects in the world,
* i.e. which elements in the `objects` field of WorldState, correspond
* to the ones referred to in the sentence.
*
* Moreover, it has to derive what the intended goal state is and
* return it as a logical formula described in terms of literals, where
* each literal represents a relation among objects that should
* hold. For example, assuming a world state where "a" is a ball and
* "b" is a table, the command "put the ball on the table" can be
* interpreted as the literal ontop(a,b). More complex goals can be
* written using conjunctions and disjunctions of these literals.
*
* In general, the module can take a list of possible parses and return
* a list of possible interpretations, but the code to handle this has
* already been written for you. The only part you need to implement is
* the core interpretation function, namely `interpretCommand`, which produces a
* single interpretation for a single command.
*/
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
    Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
    * @param parses List of parses produced by the Parser.
    * @param currentState The current state of the world.
    * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
    */
    export function interpret(parses : Parser.ParseResult[], currentState : WorldState) : InterpretationResult[] {
        var errors : Error[] = [];
        var interpretations : InterpretationResult[] = [];
        parses.forEach((parseresult) => {
            try {
                var result : InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
            } catch(err) {
                errors.push(err);
            }
        });

        if (interpretations.length) {
            return interpretations;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface InterpretationResult extends Parser.ParseResult {
        interpretation : DNFFormula;
    }

    export type DNFFormula = Conjunction[];
    type Conjunction = Literal[];

    /**
    * A Literal represents a relation that is intended to
    * hold among some objects.
    */
    export interface Literal {
        /** Whether this literal asserts the relation should hold
         * (true polarity) or not (false polarity). For example, we
         * can specify that "a" should *not* be on top of "b" by the
         * literal {polarity: false, relation: "ontop", args:
         * ["a","b"]}.
         */
        polarity : boolean;
        /** The name of the relation in question. */
        relation : string;

        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */
        args : string[];
    }

    export function stringify(result : InterpretationResult) : string {
        return result.interpretation.map((literals) => {
            return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
            // return literals.map(stringifyLiteral).join(" & ");
        }).join(" | ");
    }

    export function stringifyLiteral(lit : Literal) : string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private

    /*
    * Core command instructions
    */
    const moveCmd = "move"
    const takeCmd = "take"
    const putCmd = "put"

    const floor = "floor"

    // quantifiers
    const allq = "all"
    const anyq = "any"
    const theq = "the"

    /*
    * An enumeration of the various relations
    */
    export enum Rel {
        leftof,
        rightof,
        above,
        ontop,
        under,
        beside,
        inside,
        holding
    }

    /**
     * Based on a command and the given state of the world, this function
     * returns a list of interpretations represting a disjunctive normal form
     * formula.
     *
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type
     * `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     * @throws An error when no valid interpretations can be found
     */
    function interpretCommand(cmd: Parser.Command, state: WorldState) : DNFFormula {
        var interpretation: DNFFormula = [];
        state.objects[floor] = { "form": floor, "size": null, "color": null };
        switch (cmd.command) {
            case takeCmd:
                var objcts: string[] = filter(cmd.entity.object, state);
                objcts.forEach(obj => {
                    interpretation.push([{ polarity: true, relation: "holding", args: [obj] }])
                });
                // handle the case where an object is being held by the robot arm
                if (state.holding != null) {
                    if (isMatch(cmd.entity.object, state.objects[state.holding])) {
                        objcts.push(state.holding);
                        interpretation.push([{ polarity: true, relation: "holding", args: [state.holding] }])
                    }
                }
                if (interpretation.length > 1 && cmd.entity.quantifier === theq && objcts.length > 1) {
                    throw new AmbiguityError(mkClarificationMessage(objcts, state));
                }
                break;
            case putCmd:
            case moveCmd:
                var objsToMove: string[] = [];
                var destinations: string[] = filter(cmd.location.entity.object, state);
                var entQuant: string;
                if (cmd.entity) {  // A "put the <object> <location> command"
                    var holdingMatch: boolean = false;
                    var holdingMatchDest: boolean = false;
                    if (state.holding != null) {
                        holdingMatch = isMatch(cmd.entity.object, state.objects[state.holding]);
                        holdingMatchDest = isMatch(cmd.location.entity.object, state.objects[state.holding]);
                        if (holdingMatchDest) {
                            destinations.push(state.holding);
                        }
                    }
                    objsToMove = filter(cmd.entity.object, state);
                    if (holdingMatch) {
                        objsToMove.push(state.holding);
                    }
                    entQuant = cmd.entity.quantifier;
                } else {  // put 'it'
                    if (state.holding === null) {
                        throw "You are not holding anything. Please rephrase."
                    }
                    objsToMove = [state.holding];
                    entQuant = theq;
                }

                if (cmd.location.entity.object.form === floor) {
                    destinations.push(floor);
                }

                var locQuant: string = cmd.location.entity.quantifier
                var rela: Rel = (<any> Rel)[cmd.location.relation]
                if (entQuant === allq && locQuant === allq
                                            && (rela === Rel.inside || rela === Rel.ontop)) {
                    throw "Things can only be inside or on top exactly one object"
                }
                // handle commands like 'put a ball in every box'
                if (((entQuant === anyq && locQuant === allq && destinations.length > 1
                      && (rela === Rel.inside || rela === Rel.ontop)) // not sure about this
                      || (entQuant === allq && locQuant === anyq && objsToMove.length > 1))) {
                    var temp: any = [];
                    for (var obj of objsToMove) {
                        for (var dest of destinations) {
                            if (Util.isValid(state.objects[obj], state.objects[dest],
                                                                  cmd.location.relation)) {
                                temp.push({ polarity: true,
                                      relation: cmd.location.relation,
                                      args: [obj, dest] });
                            }
                        }
                    }
                    if (temp.length == 0) {
                        throw "No valid interpretation found"
                    }
                    // group by the entity object
                    var groups = Util.groupBy(temp, function(item: any) {
                        return item.args[0];
                    });
                    // take the cartesian product to get all pairs of conjucts
                    interpretation = Util.cartProd.apply(this, groups)
                } else if (entQuant === anyq && locQuant === allq) {
                    var temp1: any = []
                    var counter: number = 0
                    for (var obj of objsToMove) {
                        ++counter;
                        for (var dest of destinations) {
                            if (Util.isValid(state.objects[obj], state.objects[dest],
                                                                  cmd.location.relation)) {
                                temp1.push({ polarity: true,
                                      relation: cmd.location.relation,
                                      args: [obj, dest] });
                            }
                        }
                    }
                    // split by how many entity objects there are
                    var s = Util.splitUp(temp1, counter);
                    if (counter == 1) {
                        interpretation = s;
                    } else {
                        for (var x of s) {
                            interpretation.push(x)
                        }
                    }
                 } else if ((entQuant === theq && locQuant === allq)
                                                    || (entQuant === allq && locQuant === theq)) {
                    var tmp: any = []
                    for (var obj of objsToMove) {
                        for (var dest of destinations) {
                            if (Util.isValid(state.objects[obj], state.objects[dest],
                                                                 cmd.location.relation)) {
                               if (rela === Rel.inside || (rela === Rel.ontop
                                        && state.objects[dest].form !== floor)) {
                                   throw "Things can be inside or on top exactly one object"
                               }
                               var p = { polarity: true,
                                     relation: cmd.location.relation,
                                     args: [obj, dest] }
                               tmp.push(p);

                            }
                        }
                    }
                    if (tmp.length == 0) {
                        throw "No valid interpretation found"
                    }
                    var gs: any = []
                    tmp = Util.unique(tmp)
                    // If more than one object matches and the quantifier is 'the' throw ambiguity error with a question
                    if (entQuant === allq && locQuant === theq && destinations.length > 1) {
                        throw new AmbiguityError(mkClarificationMessage(destinations, state));
                    } else if (entQuant === theq && locQuant === allq && objsToMove.length > 1) {
                        throw new AmbiguityError(mkClarificationMessage(objsToMove, state));
                    } else {
                        gs = Util.groupBy(tmp, function(item: any) {
                            return item.relation;
                        });
                        interpretation = gs;
                    }
                 } else if ((entQuant === allq && objsToMove.length > 1)
                                                        || locQuant === allq) {
                     var tmp: any = []
                     for (var obj of objsToMove) {
                         for (var dest of destinations) {
                             if (Util.isValid(state.objects[obj], state.objects[dest],
                                                                  cmd.location.relation)) {
                                var p = { polarity: true,
                                      relation: cmd.location.relation,
                                      args: [obj, dest] }
                                tmp.push(p);

                             }
                         }
                     }
                     var groups = Util.groupBy(Util.unique(tmp), function(item: any) {
                         return item.relation;
                     });
                     interpretation = groups;
                } else {
                    for (var obj of objsToMove) {
                        for (var dest of destinations) {
                            if (Util.isValid(state.objects[obj], state.objects[dest],
                                                                  cmd.location.relation)) {
                                interpretation.push([{ polarity: true,
                                      relation: cmd.location.relation,
                                      args: [obj, dest]}]);
                            }
                        }
                    }
                    if (interpretation.length > 1 && entQuant === theq && objsToMove.length > 1) {
                        throw new AmbiguityError(mkClarificationMessage(objsToMove, state));
                    }
                    if (interpretation.length > 1 && locQuant === theq && destinations.length > 1) {
                        throw new AmbiguityError(mkClarificationMessage(destinations, state));
                    }
                }
                break;
            default:
                throw "Cannot recognize actions";
        }
        if (interpretation.length == 0) {
            throw "No valid interpetations found."
        }
        return Util.unique(interpretation);
    }

    /**
     * Used to build a clarification message in case the interpreter find an
     * ambiguity when we have multiple objects being referred to with 'the'.
     * @param objects The list of possible objects
     * @param state The world state in which the ambiguity occurred.
     * @returns A message explaining the ambiguity
     */
    function mkClarificationMessage(objects: string[], state: WorldState) : string {
        var possibleObjs: string[] = [];
        for (var obj of objects) {
            var stackn: number = 0;
            for (var a: number = 0; a < state.stacks.length; ++a) {
                if (state.stacks[a].indexOf(obj) != -1) {
                    stackn = a + 1;
                    break;
                }
            }
            possibleObjs.push("the " + state.objects[obj].size + " "
                           + state.objects[obj].color + " "
                           + state.objects[obj].form + " (in stack "
                           + stackn + ")");
        }
        return possibleObjs.join(" or ");
    }

    // take (the white ball left of the table) under the box
    // take the (white ball left of (the table under the box))

    /**
     * Finds all possible objects that could match the given filter 'obj' in the
     * given world state.
     * @param obj The filter object to match other objects in the world with.
     * @param state The state in which to find the objects.
     * @returns A list of names of the objects that matches the given filter.
     */
    function filter(obj: Parser.Object, state: WorldState): string[] {
        var result: string[] = [];
        var leif: string[];
        var objects: string[];
        if (obj.location === null || typeof obj.location === "undefined") {
            objects = Array.prototype.concat.apply([], state.stacks);
        } else {
            if (obj.object.object != null) {
                leif = filter(obj.object, state);
                objects = filter_relations(obj.location, state);
                objects = objects.filter(value => {
                    return leif.indexOf(value) != -1
                });
            } else {
                objects = filter_relations(obj.location, state);
            }
        }
        if (objects.length === 0) {
          throw "Couldn't find any matching object";
        }
        var tmp: Parser.Object;
        // obj based on desired properties
        for (var n of objects) {
            tmp = state.objects[n];
            if (isMatch(obj, tmp))
                result.push(n);
        }
        return result;
    }

    /**
     * Gives a list of all objects with the given relation.
     * @param location The object describing the relation.
     * @param state The current world state.
     * @returns A list of all objects with the given relation.
     */
    function filter_relations(location: Parser.Location, state: WorldState) : string[] {
        var relation: Rel = (<any>Rel)[location.relation];
        switch (relation) {
            case Rel.leftof:
                return leftRightOf(location, state, relation);
            case Rel.rightof:
                return leftRightOf(location, state, relation);
            case Rel.inside:
                return inside(location, state);
            case Rel.above:
                return aboveUnder(location, state, relation);
            case Rel.under:
                return aboveUnder(location, state, relation);
            case Rel.beside:
                return beside(location, state);
            case Rel.ontop:
                return onTop(location, state);
            default:
                throw "No matching relation";
        }
    }

    /**
     * Checks if the given object has the size, form and color specified in 'filter'.
     * @param filter An object with the color, size and form to match.
     * @param obj The object to match with the provided filter.
     * @returns True if the object is a match, false otherwise.
     */
    function isMatch(filter: Parser.Object, obj: Parser.Object) : boolean {
        var color_match: boolean;
        var form_match: boolean;
        var size_match: boolean;
        if (filter.object === null || typeof filter.object === "undefined") {
            color_match = filter.color == null
                || obj.color === filter.color;
            form_match = filter.form == null
                || obj.form === filter.form
                || filter.form === "anyform";
            size_match = filter.size == null
                || obj.size === filter.size;
        } else {
            color_match = filter.object.color == null
                || obj.color === filter.object.color;
            form_match = filter.object.form == null
                || obj.form === filter.object.form
                || filter.object.form === "anyform";
            size_match = filter.object.size == null
                || obj.size === filter.object.size;
        }
        return color_match && form_match && size_match;
    }

    /**
     * Gives all objects in the given state that are either under or above the
     * specified location.
     * @param location The location that the object should be above or under.
     * @param state The current world state.
     * @param relation Should be either Rel.above or Rel.under.
     * @returns A list of all objects above or under the given location.
     */
    function aboveUnder(location: Parser.Location, state: WorldState, relation: Rel) : string[] {
        var result: string[] = [];
        if (location.entity.object.form === floor && relation === Rel.above) {
            state.stacks.forEach(stack => {
                if (stack.length > 0)
                    result.push(stack[0]);
            });
        } else {
            var delimiters: string[] = filter(location.entity.object, state);
            delimiters.forEach(delimiter => {
                state.stacks.forEach(stack => {
                    var index = stack.indexOf(delimiter);
                    if (index != -1) {
                       if (relation === Rel.above) {
                           result = result.concat(stack.slice(index));
                       } else {
                           result = result.concat(stack.slice(0, index));
                       }
                   }
                })
            });
        }
        return result;
    }

    /**
     * Gives all objects in the given state that are inside the specified
     * location.
     * @param location The location that the object should be inside.
     * @param state The current world state.
     * @returns A list of all objects above or under the given location.
     */
    function inside(location: Parser.Location, state: WorldState) : string[] {
        var result: string[] = [];
        var potentialBoxes: string[] = filter(location.entity.object, state);
        var objFound: Parser.Object;
        potentialBoxes.forEach(potentialBox => {
            state.stacks.forEach(stack => {
                var index: number = stack.indexOf(potentialBox);
                objFound = state.objects[potentialBox];
                if (index > -1) {
                    if (index + 1 < stack.length && objFound.form == "box") {
                        result.push(stack[index + 1]);
                    }
                }
            });
        });
        return result;
    }

    /**
     * Gives all objects in the given state that are either left or right of the
     * specified location.
     * @param location The location that the object should be left or right of.
     * @param state The current world state.
     * @param relation Should be either Rel.left or Rel.right.
     * @returns A list of all objects either left or right of the given location.
     */
    function leftRightOf(location: Parser.Location, state: WorldState, relation: Rel) : string[] {
        var result: string[] = [];
        var leftOfObj: string[] = filter(location.entity.object, state);

        leftOfObj.forEach(delimiter => {
            for (var i: number = 0 ; i < state.stacks.length; ++i) {
                if (state.stacks[i].indexOf(delimiter) != -1) {
                    if (relation === Rel.leftof) {
                        for (var x: number = 0; x < i; ++x) {
                            result = result.concat(state.stacks[x]);
                        }
                    } else {
                        for (var x: number = i + 1; x < state.stacks.length; ++x) {
                            result = result.concat(state.stacks[x]);
                        }
                    }
                    break;
                }
            }
        });
        return result;
    }

    /**
     * Gives all objects in the given state that are beside (directly adjacent to)
     * the specified location.
     * @param location The location that the object should be beside.
     * @param state The current world state.
     * @returns A list of all objects beside the given location.
     */
    function beside(location: Parser.Location, state: WorldState) : string[] {
        var result: string[] = [];
        var leftOfObj: string[] = filter(location.entity.object, state);
        leftOfObj.forEach(bottom => {
            for (var i: number = 0 ; i < state.stacks.length; ++i) {
                if (state.stacks[i].indexOf(bottom) != -1) {
                    if (i != 0) {
                        result = result.concat(state.stacks[i - 1]);
                    }
                    if (i != state.stacks.length - 1) {
                        result = result.concat(state.stacks[i + 1]);
                    }
                    break;
                }
            }
        });
        return result;
    }

    /**
     * Gives all objects in the given state that are on top of the specified
     * location.
     * @param location The location that the object should be on top of.
     * @param state The current world state.
     * @returns A list of all objects on top of the given location.
     */
    function onTop(location: Parser.Location, state: WorldState) : string[] {
        // if(location.entity.object.form === "box")
        //     return [];
        var result: string[] = [];
        if (location.entity.object.form === floor) {
            state.stacks.forEach(stack => {
                if (stack.length > 0) {
                    result.push(stack[0]);
                }
            });
        } else {
            var delimiters: string[] = filter(location.entity.object, state);
            var objFound: Parser.Object;
            delimiters.forEach(delimiter => {
                state.stacks.forEach(stack => {
                    var index = stack.indexOf(delimiter);
                    objFound = state.objects[delimiter];
                    if (index != -1 && objFound.form != "box") {
                        if (index + 1 < stack.length) {
                            result = [stack[index + 1]]
                        }
                    }
                })
            })
        }
        return result;
    }

    // A custom error class used when we find an ambiguity error.
    export class AmbiguityError implements Error {
        public name: string = "Interpreter.AmbiguityError"
        public message: string;
        constructor(m: string) {
            this.message = m
        }
    }
}
