(function () {
    function DataFetcher(urlFactory, delay) {
        var self = this;

        self.repeat = false;
        self.delay = delay;
        self.timer = null;
        self.requestObj = null;

        function getNext() {
            self.requestObj = $.ajax({
                    url: urlFactory()
                }).done(function(response) {
                    $(self).trigger("stateFetchingSuccess", {
                        result: response
                    });
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    $(self).trigger("stateFetchingFailure", {
                        error: textStatus
                    });
                }).always(function() {
                    if (self.repeat && _.isNumber(self.delay)) {
                        self.timer = setTimeout(getNext, self.delay);
                    }
                });
        }

        self.start = function(shouldRepeat) {
            self.repeat = shouldRepeat;
            getNext();
        };

        self.stop = function() {
            self.repeat = false;
            clearTimeout(self.timer);
        };

        self.repeatOnce = function() {
            getNext();
        };

        self.setDelay = function(newDelay) {
            this.delay = newDelay;
        };
    }

    function addNewEntry($container, contentHTML) {
        var $innerSpan = $("<p/>").text(contentHTML),
            $newEntry = $("<li/>").append($innerSpan);

        $container.append($newEntry);
    }

    var $trafficStatusList = $("#mockTrafficStat"),
        df2 = new DataFetcher(function() {
            return "/traffic_status";
        });

    $(df2).on({
        "stateFetchingSuccess": function(event, data) {
            // var graph = draw(data.result.data);// return
            // addEntry(graph);
            var linkdict = {};
            var nodedict = {};
            var linkarray = [];
            var nodearray = [];

            data.result.data.forEach(function(dataEntry) {
                var key = dataEntry.destObj + dataEntry.srcObj;
                if(linkdict.hasOwnProperty(key)){
                  linkdict[key].packets += dataEntry.packets;
                  linkdict[key].traffic += dataEntry.traffic;
                }
                else {
                  linkdict[key] = dataEntry;
                }
                var sourcekey = dataEntry.srcObj;
                var destkey = dataEntry.destObj;
                if(nodedict.hasOwnProperty(sourcekey) === false){
                  nodedict[sourcekey] = sourcekey;
                }
                else if(nodedict.hasOwnProperty(destkey) === false){
                  nodedict[destkey] = destkey;
                }
                // addNewEntry($trafficStatusList, JSON.stringify(dataEntry));

            });
            for(var key in linkdict){
              var object = {
                  "source":linkdict[key].srcObj,
                  "target":linkdict[key].destObj,
                  "value":linkdict[key].traffic
              }
              linkarray.push(object);
            }
            for(var key in nodedict){
              var object = {"id":key}
              nodearray.push(object);
            }
            var graph = {};
            graph.nodes = nodearray;
            graph.links = linkarray;
            console.log("graph ",graph);

            draw(graph);
        },
        "stateFetchingFailure": function(event, data) {
            addNewEntry($trafficStatusList, JSON.stringify(data.error));
            addNewEntry($trafficStatusList, "Hit a snag. Retry after 1 sec...");
            setTimeout(function() {
                $trafficStatusList.html("");
                df2.repeatOnce();
            }, 1000);
        }
    });

    df2.start();
})();

function draw(data){
  var svg = d3.select("svg"),
      width = +svg.attr("width"),
      height = +svg.attr("height");

  // var color = d3.scaleOrdinal(d3.schemeCategory20);

  var simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(function(d) { return d.id; }))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2));

    var link = svg.append("g")
        .attr("class", "links")
      .selectAll("line")
      .data(data.links)
      .enter().append("line")
        .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

    var node = svg.append("g")
        .attr("class", "nodes")
      .selectAll("circle")
      .data(data.nodes)
      .enter().append("circle")
        .attr("r", 5)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("title")
        .text(function(d) { return d.id; });

    simulation
        .nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

    function ticked() {
      link
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
    }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
};
