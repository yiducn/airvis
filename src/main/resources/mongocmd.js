/**
 * Created by yidu on 11/18/15.
 */

db.pm_preProcess.aggregate(
    [
        {$match : { }},
        {
            $group : {
                _id : "$time",
                pm25 : {$avg: "$pm25"},
                co : {$avg: "$co"},
                no2 : {$avg: "$no2"},
                o3 : {$avg: "$o3"},
                pm10 : {$avg: "$pm10"},
                so2 : {$avg: "$so2"}
            }
        }
    ]
)