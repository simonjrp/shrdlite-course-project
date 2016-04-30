///<reference path="lib/collections.ts"/>
/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/


/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}

/**
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/


function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {

  var distanceFromStart  : collections.Dictionary<Node,number> = new collections.Dictionary<Node,number>();
  distanceFromStart.setValue(start, 0)

  var distanceToGoal :  collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
  distanceToGoal.setValue(start, heuristics( start) )

  function compareCost(a : Node, b : Node) : number {
    if (distanceToGoal.getValue(a) < distanceToGoal.getValue(b))
        return 1
    else if (distanceToGoal.getValue(a) > distanceToGoal.getValue(b))
        return -1
    else
        return 0
    };

    var current : Node;
    var visited : collections.Set<Node> = new collections.Set<Node>();

    var frontier : collections.PriorityQueue<Node> = new collections.PriorityQueue<Node>(compareCost) ;
    var frontierContains : collections.Set<Node> = new collections.Set<Node>() ;
    frontier.enqueue( start );
    frontierContains.add( start )



    var cameFrom :  collections.Dictionary<Node, Node> = new collections.Dictionary<Node, Node>();

    var neighbour : Edge<Node>;
    var distance_to_neighbour_from_start: number;

    var result : SearchResult<Node> = new SearchResult<Node>();
    result.path = new Array<Node>();

    var startTime: number = (new Date().getTime()) / 1000;
    var timeElapsed: number = 0;
    var timeStamp: number = (new Date().getTime()) / 1000;

    while( !frontierContains.isEmpty() && timeElapsed <= timeout )  {

        //Since the pq dont have an update function
        //a vertex may be addad several times
        //The latest updated value will always be on the top before the others
        do {
          current = frontier.dequeue()
        }while( !frontierContains.contains(current) )
        frontierContains.remove( current )
        visited.add(current);

        if( goal( current) ) {
          result.cost = distanceFromStart.getValue( current );
          result.path.push( current )
          while (cameFrom.containsKey( current) ) {
            current = cameFrom.getValue(current)
            result.path.push(current)
          }
          result.path = result.path.reverse();
          return result;
        }


        for( var i : number = 0; i < graph.outgoingEdges(current).length; ++i ) {
          neighbour = graph.outgoingEdges(current)[i];
          if ( visited.contains( neighbour.to) ) {
              continue
          }

          distance_to_neighbour_from_start = distanceFromStart.getValue(neighbour.from) + neighbour.cost;

          if (!frontierContains.contains( neighbour.to )) {
            frontierContains.add( neighbour.to )
          }
          else if( distance_to_neighbour_from_start >= distanceFromStart.getValue(neighbour.to) ) {
              continue
          }

          // This path is the best until now
          cameFrom.setValue(neighbour.to, neighbour.from );
          distanceFromStart.setValue(neighbour.to, distance_to_neighbour_from_start );
          distanceToGoal.setValue(neighbour.to, distance_to_neighbour_from_start + heuristics(neighbour.to) );
          frontier.enqueue(neighbour.to);
        } //for

        timeStamp = new Date().getTime() / 1000;
        timeElapsed = timeStamp - startTime;
    } //while
    throw new Error("#aStarSearch - No path was found");
}
