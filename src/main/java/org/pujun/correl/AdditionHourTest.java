package org.pujun.correl;

import com.mongodb.*;
import org.geotools.referencing.GeodeticCalculator;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.SimpleTimeZone;

/**
 * Created by milletpu on 16/4/25.
 */
public class AdditionHourTest {

    String oneCluster = "1001A";
    String codes ="1002A";
    public AdditionHourTest() throws ParseException {
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));

        MongoClient client = new MongoClient("127.0.0.1", 27017);
        DB db = client.getDB("airdb");
        DBCollection pmCollection = db.getCollection("pm_data");
        DBCollection pmStationCollection = db.getCollection("pm_stations");
        DBCollection clusterCollection = db.getCollection("cluster");
        DBCollection clusterMeteoCollection = db.getCollection("clusterMeteo");
        DBCollection meteoStationCollection = db.getCollection("meteo_stations");
        DBCollection meteoCollection = db.getCollection("meteo_data");

        BasicDBObject queryCenterMeteoStation = new BasicDBObject();   //圆心内站点的经纬度
        queryCenterMeteoStation.append("code", codes);
        DBCursor curCenterMeteoStation = pmStationCollection.find(queryCenterMeteoStation);
        DBObject thisCenterMeteoStation = curCenterMeteoStation.next();
        double centerLat = Double.parseDouble(thisCenterMeteoStation.get("lat").toString());
        double centerLon = Double.parseDouble(thisCenterMeteoStation.get("lon").toString());

        double clusterDistance, clusterSpd;
        int addition = 0;
        BasicDBObject queryClusterID = new BasicDBObject();     //查询该站所在的cluster的编号clusterid
        queryClusterID.append("code", oneCluster);
        DBCursor curCluesterID = clusterCollection.find(queryClusterID);
        String clusterID = curCluesterID.next().get("clusterid").toString();
        System.out.println("------------------------" + clusterID);

        BasicDBObject queryClusterMeteo = new BasicDBObject();      //查询此cluster对应的meteo站编号usaf
        queryClusterMeteo.append("clusterid", clusterID);
        DBCursor curClusterMeteo = clusterMeteoCollection.find(queryClusterMeteo);
        int clusterMeteo = Integer.parseInt(curClusterMeteo.next().get("usaf").toString());
        System.out.println("------------------------" + clusterMeteo);

        BasicDBObject queryClusterMeteoData = new BasicDBObject();  //根据meteo站编号和起始时间查询当地风速spd
        queryClusterMeteoData.append("usaf", clusterMeteo);
        queryClusterMeteoData.append("time", df.parse("2015-03-01 00:00:00"));
        DBCursor curClusterMeteoData = meteoCollection.find(queryClusterMeteoData);
        clusterSpd = Double.parseDouble(curClusterMeteoData.next().get("spd").toString());
        System.out.println("------------------------" + clusterSpd);

        BasicDBObject queryClusterMeteoStation = new BasicDBObject();   //根据meteo站编号查询其经纬度
        queryClusterMeteoStation.append("code", oneCluster);
        DBCursor curClusterMeteoStation = pmStationCollection.find(queryClusterMeteoStation);
        DBObject thisClusterMeteoStation = curClusterMeteoStation.next();
        double clusterLat = Double.parseDouble(thisClusterMeteoStation.get("lat").toString());
        double clusterLon = Double.parseDouble(thisClusterMeteoStation.get("lon").toString());


        GeodeticCalculator calc = new GeodeticCalculator();
        calc.setStartingGeographicPoint(clusterLon, clusterLat);
        calc.setDestinationGeographicPoint(centerLon, centerLat);
        clusterDistance = calc.getOrthodromicDistance() / 1609.344;
        System.out.println("------------------------" + clusterDistance);

        if (clusterSpd != 0 && clusterSpd != -1) {
            addition = (int) (clusterDistance / clusterSpd);
        } else {
            addition = 24;
        }
        System.out.println(addition);

    }

    public static void main(String[] args) throws ParseException {
        AdditionHourTest additionHourTest = new AdditionHourTest();
    }
}
