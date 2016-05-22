///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

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

    // could add for all keywords, idk...
    const floor = "floor"

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
        state.objects["floor"] = { "form": "floor", "size": null, "color": null };

        switch (cmd.command) {
            case takeCmd:
                //  if (cmd.comman)
                filter(cmd.entity.object, state).forEach(obj => {
                    interpretation.push([{ polarity: true, relation: "holding", args: [obj] }])
                });
                break;
            case moveCmd:
                var objsToMove = filter(cmd.entity.object, state);
                var destinations = filter(cmd.location.entity.object, state);
                if (cmd.location.entity.object.form === floor) {
                    destinations.push(floor);
                }

                var entQuant: string = cmd.entity.quantifier
                var locQuant: string = cmd.location.entity.quantifier
                var rela: string = cmd.location.relation

                if (entQuant === "all" && locQuant === "all"
                                            && (rela === "inside" || rela === "ontop")) {
                    throw "Things can only be inside or on top exactly one object"
                }

                if (((entQuant === "any" && locQuant === "all" && destinations.length > 1
                      && (rela === "inside" || rela === "ontop")) // not sure about this
                      || (entQuant === "all" && locQuant === "any" && objsToMove.length > 1))){
                    var temp: any = [];
                    var c: number = 0;
                    for (var obj of objsToMove) {
                        ++c;
                        for (var dest of destinations) {
                            if (isValid(state.objects[obj], state.objects[dest],
                                                                  cmd.location.relation)) {
                                temp.push({ polarity: true,
                                      relation: cmd.location.relation,
                                      args: [obj, dest] });
                            }
                        }
                    }
                    console.log("first")
                    var groups = groupBy(temp, function(item: any) {
                        return item.args[0];
                    });
                    var cprod = cartProd.apply(this, groups)
                    interpretation = cprod;
                } else if ((entQuant === "any" && locQuant === "all")) {
                    console.log("second")
                    var temp1: any = []
                    var counter: number = 0
                    for (var obj of objsToMove) {
                        ++counter;
                        for (var dest of destinations) {
                            if (isValid(state.objects[obj], state.objects[dest],
                                                                  cmd.location.relation)) {
                                temp1.push({ polarity: true,
                                      relation: cmd.location.relation,
                                      args: [obj, dest] });
                            }
                        }
                    }
                    var s = splitUp(temp1, counter);
                    if (counter == 1) {
                        interpretation = s;
                    } else {
                        for (var x of s) {
                          interpretation.push(x)
                        }
                    }
                 } else if ((entQuant === "the" && locQuant === "all") ||
                            (entQuant === "all" && locQuant === "the")) {
                    var tmp: any = []
                    for (var obj of objsToMove) {
                        for (var dest of destinations) {
                            if (isValid(state.objects[obj], state.objects[dest],
                                                                 cmd.location.relation)) {
                               var p = { polarity: true,
                                     relation: cmd.location.relation,
                                     args: [obj, dest] }
                               tmp.push(p);

                            }
                        }
                    }
                    var gs: any = []
                    tmp = unique(tmp)
                    if (entQuant === "all" && locQuant === "the" && destinations.length > 1) {
                        gs = groupBy(tmp, function(item: any) {
                            return item.args[1];
                        });
                        // Ambiguity!
                    } else if (entQuant === "the" && locQuant === "all" && objsToMove.length > 1) {
                        gs = groupBy(tmp, function(item: any) {
                        return item.args[0];
                      });
                      // Ambiguity!
                    } else {
                        gs = groupBy(tmp, function(item: any) {
                            return item.relation;
                        });
                    }
                    interpretation = gs;
                 } else if ((entQuant === "all" && objsToMove.length > 1)
                              || locQuant === "all") {
                     var tmp: any = []
                     for (var obj of objsToMove) {
                         for (var dest of destinations) {
                             if (isValid(state.objects[obj], state.objects[dest],
                                                                  cmd.location.relation)) {
                                var p = { polarity: true,
                                      relation: cmd.location.relation,
                                      args: [obj, dest] }
                                tmp.push(p);

                             }
                         }
                     }
                     var groups = groupBy(unique(tmp), function(item: any) {
                         return item.relation;
                     });
                     interpretation = groups;
                } else {
                    for (var obj of objsToMove) {
                        for (var dest of destinations) {
                            if (isValid(state.objects[obj], state.objects[dest],
                                                                  cmd.location.relation)) {
                                interpretation.push([{ polarity: true,
                                      relation: cmd.location.relation,
                                      args: [obj, dest]}]);
                            }
                        }
                    }
                    // check for ambiguity here
                }
                break;
            default:
                throw "Cannot recognize actions";
        }
        if (interpretation.length == 0) {
            throw "No valid interpetations found."
        }
        return unique(interpretation);
    }

    function groupBy(array: any, f: any) {
        var groups = {};
        array.forEach(function(o: any) {
            var group = JSON.stringify(f(o));
            (<any>groups)[group] = (<any>groups)[group] || [];
            (<any>groups)[group].push(o);
        });
        return Object.keys(groups).map(function(group) {
            return (<any>groups)[group];
        });
    }

    function cartProd(paramArray: any) {
        function addTo(curr: any, args: any) {
            var i: number
            var copy: any
            var rest: any = args.slice(1)
            var last: any = !rest.length
            var result: any = [];

            for (i = 0; i < args[0].length; i++) {
                copy = curr.slice();
                copy.push(args[0][i]);

                if (last) {
                    result.push(copy);

                } else {
                    result = result.concat(addTo(copy, rest));
                }
            }
            return result;
        }
        return addTo([], Array.prototype.slice.call(arguments));
    }


    function splitUp(arr: any, n: number) {
        var rest = arr.length % n
        var restUsed = rest
        var partLength = Math.floor(arr.length / n)
        var result: any = [];

        for (var i = 0; i < arr.length; i += partLength) {
            var end = partLength + i
            var add = false;
            if (rest !== 0 && restUsed) {
                end++;
                restUsed--;
                add = true;
            }
            result.push(arr.slice(i, end));
            if (add) {
                i++;
            }
        }
        return result;
    }

    /* Removes duplicate elements from the array */
    function unique(arr: any[]) {
        var uniques: any[] = [];
        var found: any = {};
        for (var i = 0; i < arr.length; i++) {
            var stringified = JSON.stringify((<any>arr)[i]);
            if ((<any>found)[stringified]) {
                continue;
            }
            uniques.push((<any>arr)[i]);
            (<any>found)[stringified] = true;
        }
        return uniques;
    }

    // TODO: Maybe move to another place? Used here and in StateGraph
    export function isValid(objToMove: Parser.Object, destination: Parser.Object,
                                                          rel: string): boolean {
        var relation: Rel = (<any>Rel)[rel];

        // "Small objects cannot support large objects."
        if (objToMove.size === "large"
              && destination.size === "small"
              && (relation === Rel.inside
                || relation === Rel.ontop)) {
            return false;
        }

        // "Balls must be in boxes or on the floor, otherwise they roll away."
        if (objToMove.form === "ball"
            && (destination.form != "box"
                && destination.form != "floor"
                && (relation === Rel.ontop
                  || relation === Rel.inside))) {
            return false;
        }

        // "Objects are “inside” boxes, but “ontop” of other objects."
        if (destination.form === "box" && relation === Rel.ontop) {
            return false;
        }

        // "Balls cannot support anything."
        if (destination.form === "ball"
            && (relation === Rel.ontop
                || relation === Rel.inside)) {
            return false;
        }

        // "Boxes cannot contain pyramids, planks or boxes of the same size."
        if (destination.form === "box"
            && relation === Rel.inside
            && (objToMove.form === "pyramid"
                || objToMove.form === "plank"
                || (objToMove.form === "box"
                    && objToMove.size === destination.size))) {
            return false;
        }

        // "Small boxes cannot be supported by small bricks or pyramids."
        if ((objToMove.form === "box"
              || objToMove.form === "brick")
              && objToMove.size === "small"
              && relation === Rel.ontop
              && destination.form === "pyramid"
              && destination.size === "small") {
            return false;
        }

        // "Large boxes cannot be supported by large pyramids."
        // We assume that this is badly formulated because a strict
        // implementation of this rule would mean that large boxes can be on top
        // of small pyramids, which doesn't make sense.
        if (objToMove.form === "box"
              && objToMove.size === "large"
              && destination.form === "pyramid")
            return false;

        // Obvious spatial law; an object cannot be right/left/etc of itself
        if ((relation === Rel.leftof
              || relation === Rel.rightof
              || relation === Rel.beside)
              && objToMove === destination) {
            return false;
        }
        return true;
    }

    function filter(filter: Parser.Object, state: WorldState): string[] {
        var result: string[] = [];
        var used_objects: string[];
        if (filter.location === null || typeof filter.location === "undefined") {
            used_objects = Array.prototype.concat.apply([], state.stacks);
        } else {
            used_objects = filter_relations(filter.location, state);
        }
        if (used_objects.length === 0) {
          throw "Couldn't find any matching object";
        }
        var obj: Parser.Object;
        // Filter based on desired properties
        for (var n of used_objects) {
            obj = state.objects[n];
            if (isMatch(filter, obj))
                result.push(n);
        }
        return result;
    }

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

    function contains(array: Object[], obj: Object) : number {
        for (var i = 0; i < array.length; i++) {
            if (array[i] === obj)
                return i;
        }
        return -1;
    }

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
                   var index = contains(stack, delimiter);
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

    function inside(location: Parser.Location, state: WorldState) : string[] {
        var result: string[] = [];
        var potentialBoxes: string[] = filter(location.entity.object, state);
        potentialBoxes.forEach(potentialBox => {
            state.stacks.forEach(stack => {
                var index: number = contains(stack, potentialBox);
                if (index > -1) {
                    if (index + 1 < stack.length) {
                        result.push(stack[index + 1]);
                    }
                }
            });
        });
        return result;
    }

    function leftRightOf(location: Parser.Location, state: WorldState, relation: Rel) : string[] {
        var result: string[] = [];
        var leftOfObj: string[] = filter(location.entity.object, state);

        leftOfObj.forEach(delimiter => {
            for (var i: number = 0 ; i < state.stacks.length; ++i) {
                if (contains(state.stacks[i], delimiter) != -1) {
                    if (relation === Rel.leftof) {
                        for (var x: number = 0; x < i; ++x ) {
                            result = result.concat(state.stacks[x]);
                        }
                    } else {
                        for (var x: number = i + 1; x < state.stacks.length; ++x ) {
                            result = result.concat(state.stacks[x]);
                        }
                    }
                    break;
                }
            }
        });
        return result;
    }

    function beside(location: Parser.Location, state: WorldState) : string[] {
        var result: string[] = [];
        var leftOfObj: string[] = filter(location.entity.object, state);
        leftOfObj.forEach(bottom => {
            for (var i: number = 0 ; i < state.stacks.length; ++i) {
                if (contains(state.stacks[i], bottom) != -1) {
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

    function onTop(location: Parser.Location, state: WorldState) : string[] {
        var result: string[] = [];
        if (location.entity.object.form === floor) {
            state.stacks.forEach(stack => {
                if (stack.length > 0) {
                    result.push(stack[0]);
                }
            });
        } else {
            var delimiters: string[] = filter(location.entity.object, state);
            delimiters.forEach(delimiter => {
                state.stacks.forEach(stack => {
                    var index = contains(stack, delimiter);
                    if (index != -1) {
                        if (index + 1 < stack.length) {
                            result = [stack[index + 1]]
                        }
                    }
                })
            })
        }
        return result;
    }

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
                return onTop(location, state );
            default:
                throw "No matching relation";
        }
    }
}
