///<reference path="StateGraph.ts"/>
///<reference path="Graph.ts"/>

/**
* Planner module
*
* The goal of the Planner module is to take the interpetation(s)
* produced by the Interpreter module and to plan a sequence of actions
* for the robot to put the world into a state compatible with the
* user's command, i.e. to achieve what the user wanted.
*
* The planner should use your A* search implementation to find a plan.
*/
module Planner {

  //////////////////////////////////////////////////////////////////////
  // exported functions, classes and interfaces/types

  /**
  * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter.
  * @param interpretations List of possible interpretations.
  * @param currentState The current state of the world.
  * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
  */
  export function plan(interpretations : Interpreter.InterpretationResult[], currentState : WorldState) : PlannerResult[] {
    var errors : Error[] = [];
    var plans : PlannerResult[] = [];
    interpretations.forEach((interpretation) => {
      try {
        var result : PlannerResult = <PlannerResult>interpretation;
        result.plan = planInterpretation(result.interpretation, currentState);
        if (result.plan.length == 0) {
          result.plan.push("That is already true!");
        }
        plans.push(result);
      } catch(err) {
        errors.push(err);
      }
    });
    if (plans.length) {
      return plans;
    } else {
      // only throw the first error found
      throw errors[0];
    }
  }

  export interface PlannerResult extends Interpreter.InterpretationResult {
    plan : string[];
  }

  export function stringify(result : PlannerResult) : string {
    return result.plan.join(", ");
  }

  //////////////////////////////////////////////////////////////////////
  // private functions

  /**
  * The core planner function. The code here is just a template;
  * you should rewrite this function entirely. In this template,
  * the code produces a dummy plan which is not connected to the
  * argument `interpretation`, but your version of the function
  * should be such that the resulting plan depends on
  * `interpretation`.
  *
  *
  * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
  * @param state The current world state.
  * @returns Basically, a plan is a
  * stack of strings, which are either system utterances that
  * explain what the robot is doing (e.g. "Moving left") or actual
  * actions for the robot to perform, encoded as "l", "r", "p", or
  * "d". The code shows how to build a plan. Each step of the plan can
  * be added using the `push` method.
  */
  function planInterpretation(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {

    // The goal function
    function g(n: StateNode): boolean {
      var objToMove: string;
      var destination: string;
      var destIndex: number;
      var relation: Interpreter.Rel;
      var isGoal: boolean;

      // Outermost loop represents OR conditions
      for (var i: number = 0; i < interpretation.length; i++) {
        // Innermost loop represents AND conditions
        for (var j: number = 0; j < interpretation[i].length; j++) {
          relation = (<any>Interpreter.Rel)[interpretation[i][j].relation];

          if(relation === Interpreter.Rel.holding) {
            objToMove = interpretation[i][j].args[0];
          } else {
            objToMove = interpretation[i][j].args[0];
            destination = interpretation[i][j].args[1];
            // If we are holding either the destination object or
            // the object to move and we have a binary relation,
            // it cannot be the goal
            if (n.state.holding === destination
              || n.state.holding === objToMove) {
                isGoal = false;
                break;
              }
            }
            isGoal = false;

            switch (relation) {
              case Interpreter.Rel.leftof:
              case Interpreter.Rel.rightof:

              for (var k: number = 0; k < n.state.stacks.length; k++) {
                destIndex = n.state.stacks[k].indexOf(destination);
                if (destIndex != -1) {
                  var objs: string[] = [];
                  if (relation === Interpreter.Rel.leftof)
                  objs = [].concat.apply([], n.state.stacks.slice(0,k));
                  else
                  objs = [].concat.apply([], n.state.stacks.slice(k+1));
                  if (objs.indexOf(objToMove) != -1) {
                    isGoal = true;
                  }
                  break;
                }
              }
              break;
              case Interpreter.Rel.ontop:
              case Interpreter.Rel.inside:
              if (destination === "floor") {
                for (var k: number = 0; k < n.state.stacks.length; k++) {
                  if (n.state.stacks[k].length != 0 && n.state.stacks[k][0] === objToMove) {
                    isGoal = true;
                    break;
                  }
                }
              } else {
                for (var k: number = 0; k < n.state.stacks.length; k++) {
                  destIndex = n.state.stacks[k].indexOf(destination);
                  if (destIndex != -1) {
                    if (destIndex < n.state.stacks[k].length - 1
                      && n.state.stacks[k][destIndex + 1] === objToMove) {
                        isGoal = true
                      }
                      break;
                    }
                  }
                }
                break;
                case Interpreter.Rel.above:
                for (var k: number = 0; k < n.state.stacks.length; k++) {
                  destIndex = n.state.stacks[k].indexOf(destination);
                  if (destIndex != -1) {
                    if (destIndex < n.state.stacks[k].length - 1) {
                      var above: string[] = n.state.stacks[k].slice(destIndex + 1);
                      if (above.indexOf(objToMove) != -1) {
                        isGoal = true;
                      }
                    }
                    break;
                  }
                }
                break;
                case Interpreter.Rel.under:
                for (var k: number = 0; k < n.state.stacks.length; k++) {
                  destIndex = n.state.stacks[k].indexOf(destination);
                  if (destIndex != -1) {
                    if (destIndex > 0) {
                      var under: string[] = n.state.stacks[k].slice(0, destIndex);
                      if (under.indexOf(objToMove) != -1) {
                        isGoal = true;
                      }
                    }
                    break;
                  }
                }
                break;
                case Interpreter.Rel.beside:
                for (var k: number = 0; k < n.state.stacks.length; k++) {
                  destIndex = n.state.stacks[k].indexOf(destination);
                  if(destIndex != -1) {
                    if ((k > 0 && n.state.stacks[k - 1].indexOf(objToMove) != -1)
                    || (k < n.state.stacks.length - 1
                      && n.state.stacks[k + 1].indexOf(objToMove) != -1)) {
                        isGoal = true;
                      }
                      break;
                    }
                  }
                  break;
                  case Interpreter.Rel.holding:
                  isGoal = n.state.holding === objToMove;
                  break;
                  default:
                  throw "Unknown relation";
                }
                // If one condition is false within an AND statement,
                // the conjunction cannot be true
                if (!isGoal)
                break;
              }
              // If any of the conditions within an OR statement is true
              // the OR statement must be true
              if(isGoal) {
                return true;
              }
            }
            return false;
          }

          function blind( n : StateNode) : number {
            return 0;
          }

          function abs ( n : number ) : number {
            if( n < 0 ) {
              return n;
            }  else {
              return -n;
            }
          }


          function compareHeuristicWithBlind() : SearchResult<StateNode> {
            var startTime: number;
            var endTime : number;
            var blindTime : number;
            var hTime : number;

            startTime = new Date().getTime()
            var result = aStarSearch(graph, startNode, g, h, 10);
            endTime = new Date().getTime()
            hTime = endTime- startTime;

            startTime = new Date().getTime()
            aStarSearch(graph, startNode, g, blind, 10);
            endTime = new Date().getTime()
            blindTime = endTime- startTime;
            alert( "A* is " + (blindTime - hTime) + " ms faster with the heuristic vs without" );
            return result;
          }

          function h(n: StateNode): number {

            var objToMove: string;
            var destination: string;
            var destIndex: number;
            var stepsFromTop : number;
            var relation: Interpreter.Rel;
            var cheapestGoal : number = -1 ;
            var currentGoal : number;
            var ToMoveIndex : number

            // Outermost loop represents OR conditions
            for (var i: number = 0; i < interpretation.length; i++) {
              // Innermost loop represents AND conditions
              currentGoal = 0;
              for (var j: number = 0; j < interpretation[i].length; j++) {

                relation = (<any>Interpreter.Rel)[interpretation[i][j].relation];

                objToMove = interpretation[i][j].args[0];
                if(relation != Interpreter.Rel.holding) {
                  destination = interpretation[i][j].args[1];
                }


                switch (relation) {
                  case Interpreter.Rel.leftof:
                  case Interpreter.Rel.rightof:

                  var rightOfObject : string;
                  var leftOfObject : string;
                  var leftOfIndex : number;
                  var rightOfIndex : number;

                  //This is so only the left goal check is needed
                  if( relation == Interpreter.Rel.leftof) {
                    rightOfObject = destination;
                    leftOfObject = objToMove;
                  } else {
                    rightOfObject = objToMove;
                    leftOfObject = destination;
                  }

                  if( n.state.holding != leftOfObject && n.state.holding != rightOfObject  ) {
                    var rightSide : number;
                    for (var k: number = 0; k < n.state.stacks.length; k++) {
                      rightOfIndex = n.state.stacks[k].indexOf(rightOfObject)
                      if ( rightOfIndex != -1) {
                        rightSide = k;
                        stepsFromTop = n.state.stacks[k].length - rightOfIndex - 1;
                        break;
                      }
                    }
                    for( var k: number = rightSide; k < n.state.stacks.length; k++) {
                      leftOfIndex = n.state.stacks[k].indexOf(leftOfObject);
                      if ( leftOfIndex != -1 ) {
                        if( stepsFromTop > n.state.stacks[k].length - leftOfIndex - 1 ) {
                          stepsFromTop = n.state.stacks[k].length - leftOfIndex - 1;
                        }
                        break;
                      }
                    }
                    currentGoal = currentGoal + stepsFromTop;
                  }
                  break;

                  case Interpreter.Rel.ontop:
                  case Interpreter.Rel.inside:


                  var isGoal: boolean = false;
                  stepsFromTop = 0;
                  if(n.state.holding != objToMove) {
                    for (var k: number = 0; k < n.state.stacks.length; k++) {
                      ToMoveIndex = n.state.stacks[k].indexOf(objToMove);
                      if (ToMoveIndex != -1) {
                        destIndex = n.state.stacks[k].indexOf(destination);
                        if( destIndex != -1 && destIndex + 1 == ToMoveIndex ) {
                          isGoal = true;
                        } else {
                          stepsFromTop = n.state.stacks[k].length - ToMoveIndex - 1;
                        }
                        break;
                      }
                    }
                  }

                  if( !isGoal ) {
                    var destinationFromTop = -1;
                    if(n.state.holding != destination ) {
                      for (var k: number = 0; k < n.state.stacks.length; k++) {
                        if( destination === "floor") {
                          if( destinationFromTop === -1 || destinationFromTop >  n.state.stacks[k].length ) {
                            destinationFromTop = n.state.stacks[k].length;
                          }
                        } else {
                          destIndex = n.state.stacks[k].indexOf(destination);
                          if (destIndex != -1) {
                            destinationFromTop = n.state.stacks[k].length - destIndex - 1;
                            break;
                          }
                        }
                      }
                    } else {
                      destinationFromTop = 0; //TODO should there be a penalty cost for lifting destination?
                    }
                    currentGoal = currentGoal + stepsFromTop + destinationFromTop;
                  }
                  break;



                  case Interpreter.Rel.under:
                  case Interpreter.Rel.above:

                  var objectAbove : string;
                  var objectUnder : string;
                  if( relation === Interpreter.Rel.above  ) {
                    objectAbove = objToMove;
                    objectUnder = destination;
                  } else {
                    objectAbove = destination;
                    objectUnder = objToMove;
                  }

                  if( n.state.holding != objectAbove) {
                    for (var k: number = 0; k < n.state.stacks.length; k++) {
                      ToMoveIndex = n.state.stacks[k].indexOf(objectAbove);
                      if( ToMoveIndex != -1 ) {
                        destIndex = n.state.stacks[k].indexOf(objectUnder);
                        if( destIndex != -1 && ToMoveIndex <  destIndex )  { //if not a goal
                          stepsFromTop =  n.state.stacks[k].length - ToMoveIndex - 1;
                          currentGoal = currentGoal + stepsFromTop;
                        }
                        break;
                      }
                    }
                  }
                  break;

                  case Interpreter.Rel.beside:
                  if( n.state.holding != destination &&  n.state.holding != objToMove ) {
                    var ToMoveStackIndex : number;
                    var DestStackIndex : number;

                    for (var k: number = 0; k < n.state.stacks.length; k++) {
                      destIndex = n.state.stacks[k].indexOf(destination);
                      if(destIndex != -1) {
                        DestStackIndex = k;
                      }

                      ToMoveIndex = n.state.stacks[k].indexOf(objToMove);
                      if(ToMoveIndex != -1) {
                        ToMoveStackIndex = k;
                      }
                    }

                    //if not a goal
                    if( !(DestStackIndex > 0 && n.state.stacks[DestStackIndex-1 ].indexOf(objToMove) != -1 ||
                    (DestStackIndex < n.state.stacks.length - 1 && n.state.stacks[DestStackIndex + 1].indexOf(objToMove) != -1))) {
                      stepsFromTop = n.state.stacks[DestStackIndex].length - destIndex - 1;
                      if( stepsFromTop > n.state.stacks[ToMoveStackIndex].length - ToMoveIndex - 1 ) {
                        stepsFromTop = n.state.stacks[ToMoveStackIndex].length - ToMoveIndex - 1;
                      }
                      currentGoal = currentGoal + stepsFromTop;
                    }
                  }
                  break;

                  case Interpreter.Rel.holding:
                  if( n.state.holding != objToMove) {
                    for (var k: number = 0; k < n.state.stacks.length; k++) {
                      ToMoveIndex = n.state.stacks[k].indexOf(objToMove);
                      if( ToMoveIndex != -1 ) {
                        stepsFromTop =  n.state.stacks[k].length - ToMoveIndex - 1;
                        currentGoal = currentGoal + stepsFromTop;
                        break;
                      }
                    }
                  }
                  break;

                  default:
                  throw "Unknown relation";
                } //end of switch
              } //end of AND-loop
              if( cheapestGoal > currentGoal || cheapestGoal === -1 ) { // -1 indicate first iteration
                cheapestGoal = currentGoal;
              }
            } //end of OR-loop
            return cheapestGoal;
          } //end of function


          function buildPlan(result: SearchResult<StateNode>): string[] {
            var plan: string[] = [];
            var graph: Graph<StateNode> = new StateGraph(state.objects);
            var currentNode: StateNode;
            var nextNode: StateNode;
            var actions: string[] = ["l", "r", "d", "p"];
            for (var i: number = 0; i < result.path.length - 1; i++) {
              nextNode = result.path[i + 1];
              for (var a in actions) {
                currentNode = result.path[i].clone();
                currentNode.state === (<StateGraph>graph).getNextState(currentNode.state, actions[a]);
                if (currentNode.toString() === nextNode.toString()) {
                  plan.push(actions[a]);
                  break;
                }
              }
            }
            return plan;
          }
          var result : SearchResult<StateNode>;
          var startNode: StateNode = new StateNode(state);
          var graph: Graph<StateNode> = new StateGraph(state.objects);

          //result = aStarSearch(graph, startNode, g, h, 10);
          result = compareHeuristicWithBlind();


          return buildPlan(result);
        }



      }
