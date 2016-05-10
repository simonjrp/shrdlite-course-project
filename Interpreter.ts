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
    // private functions
    /**
     * The core interpretation function. The code here is just a
     * template; you should rewrite this function entirely. In this
     * template, the code produces a dummy interpretation which is not
     * connected to `cmd`, but your version of the function should
     * analyse cmd in order to figure out what interpretation to
     * return.
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula {
        var interpretation: DNFFormula = [];

        switch(cmd.command)
        {
            case "take":
                filter(cmd.entity.object, state).forEach(obj => {
                    interpretation.push([{ polarity: true, relation: "holding", args: [obj] }])
                });
                break;
            case "move":
                var objsToMove = filter(cmd.entity.object, state);
                var destinations = filter(cmd.location.entity.object, state);
                
                if(cmd.location.entity.object.form === "floor")
                    destinations.push("floor");

                if (objsToMove.length === 0 || destinations.length === 0)
                    throw "Couldn't find any matching object";
                
                objsToMove.forEach(objToMove => {
                    destinations.forEach(destination => {
                        interpretation.push([{
                            polarity: true,
                            relation: cmd.location.relation,
                            args: [objToMove, destination]
                        }]);
                    });
                });
                break;
            default:
                throw "Can't recognize action";
        }
        return interpretation;
    }

    function filter(filter: Parser.Object, state: WorldState): string[] {
        var result: string[] = [];
        var used_objects: string[];
        if(filter.location === null || typeof(filter.location) === "undefined") {
            used_objects = Array.prototype.concat.apply([], state.stacks);
        } else {
            used_objects = filter_relations(filter.location, state);
        }
        if (used_objects.length === 0)
            throw "Couldn't find any matching object";

        var obj: Parser.Object;

        // Filter based on properties

        for(var n of used_objects) {
            obj = state.objects[n];
            if (isMatch(filter,obj))
                result.push(n);
        }

        return result;
    }

    function isMatch(filter: Parser.Object, obj: Parser.Object) : boolean{
        var color_match: boolean;
        var form_match: boolean;
        var size_match: boolean;

        if(filter.object === null || typeof(filter.object) === "undefined") {
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

    function aboveUnder(location: Parser.Location, state: WorldState, relation :string) : string[] {
        var result: string[] = [];

        if(location.entity.object.form === "floor" && relation === "above") {
            state.stacks.forEach(stack => {
                   if(stack.length > 0)
                       result.push(stack[0]);
               });
            } else {
               var delimiters: string[] = filter(location.entity.object, state);
               delimiters.forEach(delimiter => {
                   state.stacks.forEach(stack => {
                       var index = contains(stack, delimiter);
                       if (index != -1) {
                           if(relation === "above") {
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

    function inside(location: Parser.Location, state: WorldState): string[] {
      var result: string[] = [];
      var potentialBoxes: string[] = filter(location.entity.object, state);
      potentialBoxes.forEach(potentialBox => {
          state.stacks.forEach(stack => {
              var index: number = contains(stack, potentialBox);
              if(index > -1) {
                  if(index+1 < stack.length) {
                      result.push(stack[index + 1]);
                  }
              }
          });
      });

      return result;
  }

    function leftRightOf(location: Parser.Location, state: WorldState, relation :string) : string[] {
        var result: string[] = [];
        var leftOfObj: string[] = filter(location.entity.object, state);
        var projectX : number;
        if( relation == "left" ) {
          projectX = 0
        } else if ( relation == "right") {
          projectX = state.stacks.length - 1;
        } else {
            throw  "not left of right"
        }

        leftOfObj.forEach(bottom => {
          for( var i :number = 0 ; i < state.stacks.length; ++i ) {
            if( contains(state.stacks[i], bottom) != -1
              && i != projectX ) {
              if( relation == "left" ) {
                for( var x : number = 0; x < i; ++x ) {
                  result = result.concat(state.stacks[x]);
                }
              } else {
                for( var x : number = i + 1; x < state.stacks.length; ++x ) {
                  result = result.concat(state.stacks[x]);
                }
              }
              break;
            }
          }
        });
        return result;
      }

      function besideOf( location: Parser.Location, state: WorldState) : string[] {
        var result: string[] = [];
        var leftOfObj: string[] = filter(location.entity.object, state);
        var projectX : number;

        leftOfObj.forEach(bottom => {
          for( var i :number = 0 ; i < state.stacks.length; ++i ) {
            if( contains(state.stacks[i], bottom) != -1 ) {
              if( i != 0 ) {
                result = result.concat(state.stacks[i - 1]);
              }

              if( i != state.stacks.length - 1 ) {
                result = result.concat(state.stacks[i + 1]);
              }
            }
            break;
        }
      }
    );
    return result;
  }

  function onTop( location: Parser.Location, state: WorldState) : string[] {
    var result: string[] = [];
    if (location.entity.object.form === "floor") {
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
                    if (index + 1 < stack.length) {
                        result = [stack[index + 1]]
                    }
                }
            })
        })
    }
     
    return result;
}

    function filter_relations(location: Parser.Location, state: WorldState): string[] {
        switch(location.relation)
        {
            case "leftof":
                return leftRightOf( location, state, "left");
            case "rightof":
                return leftRightOf( location, state, "right");
            case "inside":
                return inside(location, state);
            case "above":
                return aboveUnder(location, state, "above");
            case "under":
                return aboveUnder(location, state, "under");
            case "beside":
                  return besideOf(location, state);
            case "ontop":
                return onTop(location, state );
            default:
                throw "not implemented";
        }
    }
}
