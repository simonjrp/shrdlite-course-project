///<reference path="Graph.ts"/>
///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="lib/collections.ts"/>

// A simplified world state only containing the 

class StateNode {
    
    constructor(
        public state: WorldState
    ) { }

    compareTo(other: StateNode): number {
        if (this.state === other.state)
            return 0;
        else
            return -1;
    }

    toString(): string {
        return ("(" +  this.state.arm + ",\n" + this.state.holding + "\n"
            + this.state.stacks.toString() + ")");
    }

    clone(): StateNode {
        var newStacks: Stack[] = [];
        for(var i in this.state.stacks) {
            newStacks.push(this.state.stacks[i].slice(0));
        }
        var newState: WorldState = {
            stacks: newStacks,
            holding: this.state.holding,
            arm: this.state.arm,
            objects: this.state.objects,
            examples: this.state.examples
        };
        return new StateNode(newState);
    }
}

class StateGraph implements Graph<StateNode> {
    private nodeSet: collections.Set<StateNode>;
    constructor(public objects: { [s: string]: ObjectDefinition; })
    {
        this.nodeSet = new collections.Set<StateNode>();
    }

    outgoingEdges(node: StateNode): Edge<StateNode>[] {
        var result: Edge<StateNode>[] = [];
        var childNode: StateNode;
        var newEdge: Edge<StateNode>;
        var actions: string[] = ["l", "r", "d", "p"];
        for (var a in actions) {
            childNode = node.clone();
            childNode.state = this.getNextState(childNode.state, actions[a]);
            if (childNode.state != null) {
                newEdge = { from: node, to: childNode, cost: 1 };
                result.push(newEdge);
            }
        }
        return result;
    }

    compareNodes(a: StateNode, b: StateNode): number {
        return a.compareTo(b);
    }

    getNextState(state: WorldState, action: string): WorldState {
        switch (action) {
            case "l":
                if (state.arm > 0) {
                    state.arm = state.arm - 1;
                    return state;
                } else {
                    return null;
                }
            case "r":
                if (state.arm < state.stacks.length - 1) {
                    state.arm = state.arm + 1;
                    return state;
                } else {
                    return null;
                };
            case "p":
                if (state.stacks[state.arm].length > 0 && state.holding === null) {
                    state.holding = state.stacks[state.arm].pop();
                    return state;
                } else {
                    return null;
                }
            case "d":
                if (state.holding === null) {
                    return null;
                } else {
                    var objToMove: Parser.Object = this.objects[state.holding];
                    var destination: Parser.Object;
                    var stackSize = state.stacks[state.arm].length;
                    if (stackSize === 0)
                        destination = { "form": "floor", "size": null, "color": null };
                    else
                        destination = state.stacks[state.arm][stackSize - 1];
                    var isValid: boolean;
                    if (destination.form === "box")
                        isValid = Interpreter.isValid(objToMove, destination, "inside")
                    else
                        isValid = Interpreter.isValid(objToMove, destination, "ontop")

                    if (isValid) {
                        state.stacks[state.arm].push(state.holding);
                        state.holding = null;
                        return state;
                    }

                    return null;
                }
            default:
                return null;
        }
    }
}




