package org.pujun.interp;

import java.text.ParseException;

/**
 * Created by milletpu on 16/3/16.
 *
 * x[][] is the original data point coordinate while y[] is the corresponding value.
 * pt[] is a point to be interpolated.
 *

 */
public class RBF_interpTest {
    protected static long startTimeStamp, endTimeStamp;
    public static void main(String[] args) throws ParseException {
        startTimeStamp = System.currentTimeMillis();

//        InterpMeteo interpMeteo = new InterpMeteo("2013-12-18 06:00:00");    //set a time point
//        interpMeteo.spd(40.080, 116.585);   //set the lat and lon to get its interpolated wind-speed value (9
//        interpMeteo.dir(40.080, 116.585);   //set the lat and lon to get its interpolated wind-direction value (220

        InterpPm interpPm = new InterpPm("2013-12-18 06:00:00");    //code:1017A
        System.out.println(interpPm.pm10(39.1082, 117.237));    //39
        System.out.println(interpPm.pm25(39.1082, 117.237));    //28

        endTimeStamp = System.currentTimeMillis();
        System.out.println("total time: " + (endTimeStamp-startTimeStamp) + "ms");


//        double[][] x = {{1,1}, {2,2}, {3,3}, {4,4}, {5,5}, {6,6}, {7,7}, {8,8}, {9,9}, {10,10}};
//        double[] y = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
//        double[] pt = {6.5,6.5};
//
//        RBF_multiquadric rbf_multiquadric = new RBF_multiquadric(2);
//        RBF_interp rbf_interp_multiquadric = new RBF_interp(x,y,rbf_multiquadric);
//
//        System.out.println(rbf_interp_multiquadric.interp(pt));

    }
}
